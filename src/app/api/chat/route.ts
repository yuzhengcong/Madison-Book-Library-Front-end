import { NextResponse } from "next/server";
import OpenAI from "openai";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// 新增：清理文本中的内联引用标记
function stripCitationMarkers(s: string) {
  return (s || "")
    // remove patterns like "4:1†source" or trailing "†source"
    .replace(/\s*\b\d+\s*:\s*\d+\s*†\s*source\b\.?/gi, " ")
    .replace(/\s*†\s*source\b\.?/gi, " ")
    // remove bracketed source notes
    .replace(/\s*\[[^\]]*source\]\s*/gi, " ")
    // remove generic table-of-contents markers
    .replace(/\s*\[Back to Table of Contents\]\s*/gi, " ")
    .replace(/[【】]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}


function bookFilePath(name: string) {
  const booksDir = path.join(process.cwd(), "src", "app", "api", "chat", "books");
  return path.join(booksDir, `${name}.txt`);
}

function hashFile(fp: string) {
  const buf = fs.readFileSync(fp);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

const CACHE_FP = path.join(process.cwd(), "src", "app", "api", "chat", ".vector_cache.json");
function readCache(): Record<string, { hash: string; vectorStoreId: string; fileId: string }> {
  try {
    if (!fs.existsSync(CACHE_FP)) return {};
    const raw = fs.readFileSync(CACHE_FP, "utf-8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}
function writeCache(cache: Record<string, { hash: string; vectorStoreId: string; fileId: string }>) {
  try {
    fs.writeFileSync(CACHE_FP, JSON.stringify(cache, null, 2), "utf-8");
  } catch {}
}

async function waitIndexing(client: any, vectorStoreId: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const list = await client.vectorStores.files.list(vectorStoreId);
      const allDone = list.data.every((f: any) => f.status === "completed");
      if (allDone) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const model = body?.model;
    const selectedBooks: string[] = Array.isArray(body?.contexts)
      ? body.contexts
      : Array.isArray(body?.context)
      ? body.context
      : [];
    const question: string =
      typeof body?.prompt === "string"
        ? body.prompt
        : ((body?.messages?.[body.messages.length - 1]?.content as string) || "");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }


    if (!selectedBooks.length) {
      const reqMessages = Array.isArray(body?.messages) && body.messages.length > 0
        ? body.messages
        : [{ role: "user", content: question || "" }];

      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: reqMessages,
          temperature: 0.7,
        }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        return NextResponse.json({ error: err }, { status: resp.status });
      }
      const json = await resp.json();
      const text = stripCitationMarkers(json?.choices?.[0]?.message?.content ?? "");
      return NextResponse.json({ reply: text });
    }

    const client = new OpenAI({ apiKey });
    const beta: any = (client as any).beta;

    // 复用缓存：为每本书维护一个独立向量库，避免每次都重新上传与索引
    const cache = readCache();
    const vectorStoreIds: string[] = [];

    for (const book of selectedBooks) {
      const fp = bookFilePath(book);
      if (!fs.existsSync(fp)) continue;
      const h = hashFile(fp);
      const cached = cache[book];

      if (cached && cached.hash === h && cached.vectorStoreId) {
        // 已有索引，直接复用
        vectorStoreIds.push(cached.vectorStoreId);
        continue;
      }

      // 创建新的向量库并上传该书
      const vs = await client.vectorStores.create({ name: `madison-${book}-${Date.now()}` });
      const file = await client.files.create({ file: fs.createReadStream(fp), purpose: "assistants" });
      await client.vectorStores.fileBatches.create(vs.id, { file_ids: [file.id] });
      await waitIndexing(client, vs.id);

      cache[book] = { hash: h, vectorStoreId: vs.id, fileId: file.id };
      writeCache(cache);
      vectorStoreIds.push(vs.id);
    }

    // 创建检索型 Assistant（限定在所选书籍的向量库上）
    if (!vectorStoreIds.length) {
      const msg = "抱歉，未找到所选书籍的向量库，请确认书名与 books/*.txt 一致或先运行预热脚本。";
      return NextResponse.json({ reply: msg });
    }
    const assistant = await beta.assistants.create({
      name: "Madison Book QA",
      instructions:
        "You are a helpful library assistant. Answer strictly using the provided book files. If the answer is not found in them, say you cannot find it in the selected book(s).",
      tools: [{ type: "file_search" }],
      model: (model || process.env.OPENAI_MODEL || "gpt-4o-mini") as string,
      tool_resources: { file_search: { vector_store_ids: vectorStoreIds } },
    });

    // 建立对话线程并提问
    const thread = await beta.threads.create({ messages: [{ role: "user", content: question || "" }] });
    let run = await beta.threads.runs.create(thread.id, { assistant_id: assistant.id });
    const maxWaitMs = 60_000;
    const start = Date.now();
    while (run.status !== "completed") {
      if (Date.now() - start > maxWaitMs) break;
      await new Promise((r) => setTimeout(r, 1000));
      run = await beta.threads.runs.retrieve(thread.id, run.id);
      if (run.status === "failed") {
        return NextResponse.json({ error: run.last_error?.message || "Run failed" }, { status: 500 });
      }
    }

    const msgs = await beta.threads.messages.list(thread.id);
    const last = msgs.data.find((m: any) => m.role === "assistant");
    const pieces = last?.content ?? [];
    let text = pieces
      .map((c: any) => (c?.type === "text" ? c?.text?.value : ""))
      .filter(Boolean)
      .join("\n") || "";
    text = stripCitationMarkers(text);

    const sources: { book: string; fileId: string; quote: string }[] = [];
    for (const c of pieces) {
      const annotations = c?.type === "text" ? c?.text?.annotations : undefined;
      if (Array.isArray(annotations)) {
        for (const ann of annotations) {
          if (ann?.type === "file_citation" && ann?.file_citation?.file_id) {
            const fid = ann.file_citation.file_id as string;
            const quote = (ann.file_citation.quote as string) || "";
            let book = "";
            for (const [bk, meta] of Object.entries(readCache())) {
              if ((meta as any).fileId === fid) { book = bk; break; }
            }
            sources.push({ book: book || "unknown", fileId: fid, quote });
          }
        }
      }
    }
    const uniqueSources = Array.from(new Map(sources.map((s) => [`${s.fileId}:${s.quote}`, s])).values());

    if (!text || !text.trim()) {
      text = selectedBooks.length
        ? "抱歉，我未能在所选书籍中找到明确答案。请尝试更具体的提问，或更换/增加书籍。"
        : "抱歉，我没有生成可展示的回答。你可以选择书籍上下文后再试，或换个问题描述。";
    }

    return NextResponse.json({ reply: text, sources: uniqueSources });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}