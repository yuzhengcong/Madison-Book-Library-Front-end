/**
 * Server API route: /api/chat
 *
 * This file implements the two-step LLM pipeline used by the frontend:
 * 1) Use a retrieval/extraction model (Gemini) to extract relevant
 *    quotations from selected books based on the conversation and the
 *    user's current question.
 * 2) Use a final generation model (GPT) to compose an answer that is
 *    strictly constrained to the extracted context.
 *
 * The route returns both the extracted context snippets and the final
 * reply so the frontend can render the context and the assistant
 * response together.
 */
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Configuration — environment-driven
const BASE = process.env.OPENAI_BASE_URL;
const API_KEY = process.env.OPENAI_API_KEY;

const BOOKS_DIR = "books"; // local folder containing .txt book chunks
const EXTRACT_MODEL = "google.gemini-2.5-flash"; // model used to extract quotes
const FINAL_MODEL = "openai.gpt-5"; // model used for the final answer

// Helper: call external chat completion endpoint and return trimmed text
async function callChatModel(model: string, messages: any[]) {
  const resp = await fetch(`${BASE}v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("LLM ERROR:", err);
    throw new Error(err);
  }

  const json = await resp.json();
  return json?.choices?.[0]?.message?.content?.trim() ?? "";
}

// -----------------
// Extraction logic
// -----------------
/**
 * Ask the extractor (Gemini) to return direct quotes from chunkText that
 * are relevant to the user's question. The extractor receives the full
 * conversation history so it can use previous turns for disambiguation.
 *
 * Returns extracted text (string) or null if nothing relevant.
 */
async function extractRelevantText(
  chunkText: string,
  messages: any[],
  question: string,
  author: string,
  title: string
) {
  const systemMsg = {
    role: "system",
    content:
      "Extract all relevant parts of the provided text in relation to the given question. Respond only with direct quotes and their citations. If nothing is relevant, return 'No relevant text found'.",
  };

  // Provide the conversation so the extractor can reference earlier turns
  // (helps disambiguate pronouns and follow-up questions).
  const convo = messages.map((m: any) => `${m.role}: ${m.content}`).join("\n");

  const userMsg = {
    role: "user",
    content: `Title: ${title}\n
              Author: ${author}\n\n
              Conversation:\n${convo}\n\n
              Question: ${question}\n\n
              Text:\n${chunkText}\n\n
              Extract the relevant portion. If applicable, identify the chapter or section title:`,
  };

  const result = await callChatModel(EXTRACT_MODEL, [systemMsg, userMsg]);
  if (!result || result.includes("No relevant text found")) return null;
  return result;
}

// Read a book file, extract author/title from filename, and run extraction
async function processBook(bookName: string, messages: any[]) {
  const filePath = path.join(process.cwd(), BOOKS_DIR, bookName) + ".txt";
  console.log("📘 Processing book file:", filePath);

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    console.error("Could not read book file:", filePath, err);
    return null;
  }

  // Filename convention: author--title.txt
  let author = "";
  let title = "";
  try {
    const parts = bookName.split("--");
    author = parts[0].replace(/_/g, " ");
    title = parts[1].replace(/_/g, " ").replace(/\.txt$/i, "");
  } catch {
    return null;
  }

  // Use last user message as the question for the extractor. We use the
  // latest message because the frontend app appends the user's latest
  // turn before calling this route.
  const lastMsg = messages && messages.length ? messages[messages.length - 1].content : "";
  const extracted = await extractRelevantText(raw, messages, lastMsg, author, title);
  if (!extracted) return null;

  // Output: include a header then the extracted snippet
  const header = `----- Relevant excerpts from '${title}' by ${author} -----`;
  return `${header}\n${extracted}`;
}

// Run extraction across the selected books in parallel and collect results
async function collectRelevantChunks(contextBooks: string[], messages: any[]) {
  const tasks = contextBooks.map((book) => processBook(book, messages));
  const results = await Promise.all(tasks);
  return results.filter((r) => r !== null) as string[];
}

// -----------------
// Final answer generation
// -----------------
/**
 * Use the final LLM (GPT) to compose an answer strictly using the
 * provided context. 
 */
async function generateFinalAnswer(context: string[], messages: any[]) {
  const systemMessage = {
    role: "system",
    content: `
        "You are an AI assistant that provides accurate answers based strictly on the given context.\n"
        "- Format all responses in Markdown.\n"
        "- Do not generate content using information outside of the provided context.\n"
        "- If the context lacks relevant information, explicitly state that you do not have enough data to answer.\n"
        "- When possible, use direct quotes from the context and include references.\n"
        "- When quoting or paraphrasing, **always attribute the source using the format provided in the context**, such as [Source: Author, *Title*, Chapter or Section].\n"
        "- Give concise responses."
    `.trim(),
  };

  const convo = messages.map((m: any) => `${m.role}: ${m.content}`).join("\n");

  const userMessage = {
    role: "user",
    content: `Context:\n${context.join("\n\n")}\n\nConversation:\n${convo}\n\nProvide a well-formatted Markdown answer.`,
  };

  return await callChatModel(FINAL_MODEL, [systemMessage, userMessage]);
}

// -----------------
// API route
// -----------------
export async function POST(req: Request) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const body = await req.json();
    const { messages, context: contextBooks } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required." }, { status: 400 });
    }

    if (!contextBooks || !Array.isArray(contextBooks)) {
      return NextResponse.json({ error: "Context books array is required." }, { status: 400 });
    }

    // 1) Extract relevant snippets from selected books (Gemini)
    const context = await collectRelevantChunks(contextBooks, messages);
    console.log("🔍 Extracted context snippets:", context);

    // 2) Generate the final answer using GPT + the extracted context
    const answer = await generateFinalAnswer(context, messages);
    console.log("🔎 Final answer generated");

    // Return both the answer and the context snippets (matching answering.py)
    return NextResponse.json({ context, reply: answer });
  } catch (e: any) {
    console.error("ERROR IN /api/chat:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}