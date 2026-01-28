import { NextResponse } from "next/server";
import OpenAi from "openai";
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

// 尝试从模型文本中解析 {answer, quotes} JSON 负载（兼容常见拼写错误）
function extractAnswerPayload(raw: string): { answer?: string; quotes?: string[] } {
  const text = (raw || "").trim();
  if (!text) return {};
  // 移除代码块包裹
  const cleaned = text.replace(/^```\w*\n([\s\S]*?)\n```$/m, "$1").trim();
  try {
    const obj = JSON.parse(cleaned);
    const answer = obj.answer ?? obj.Answer ?? obj.ANSWER;
    const quotes = obj.quotes ?? obj.qoutes ?? obj.Qoutes ?? obj.QUOTES;
    return {
      answer: typeof answer === "string" ? answer : undefined,
      quotes: Array.isArray(quotes) ? quotes.filter((q: any) => typeof q === "string") : undefined,
    };
  } catch {
    return {};
  }
}

// 规范化与模糊匹配：尽量将 JSON 中的 quotes 与注解中的引文对齐
function normalizeQuote(s: string): string {
  return stripCitationMarkers(s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function jaccardSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const as = new Set(a.split(" "));
  const bs = new Set(b.split(" "));
  let inter = 0;
  for (const t of as) if (bs.has(t)) inter++;
  const union = as.size + bs.size - inter;
  return union ? inter / union : 0;
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
  } catch { }
}

async function waitIndexing(client: any, vectorStoreId: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const list = await client.vectorStores.files.list(vectorStoreId);
      const allDone = list.data.every((f: any) => f.status === "completed");
      if (allDone) return;
    } catch { }
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

    const client = new OpenAi({ apiKey });

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

    let effectiveVectorStoreIds = vectorStoreIds;
    if (selectedBooks.length >= 3) {
      const booksDir = path.join(process.cwd(), "src", "app", "api", "chat", "books");
      const allLabels = fs
        .readdirSync(booksDir)
        .filter((f) => f.endsWith(".txt"))
        .map((f) => f.replace(/\.txt$/, ""));
      const allFileIds: string[] = [];
      const allHashes: string[] = [];
      for (const label of allLabels) {
        const fp = bookFilePath(label);
        if (!fs.existsSync(fp)) continue;
        const h = hashFile(fp);
        allHashes.push(h);
        const meta = cache[label];
        if (!meta?.fileId) {
          const file = await client.files.create({ file: fs.createReadStream(fp), purpose: "assistants" });
          cache[label] = { hash: h, vectorStoreId: meta?.vectorStoreId || "", fileId: file.id };
          writeCache(cache);
          allFileIds.push(file.id);
        } else {
          allFileIds.push(meta.fileId);
        }
      }
      if (allFileIds.length) {
        const combinedHash = crypto.createHash("sha256").update(allHashes.join("|")).digest("hex");
        const aggMeta = cache["__ALL_AGG__"];
        if (aggMeta?.hash === combinedHash && aggMeta?.vectorStoreId) {
          effectiveVectorStoreIds = [aggMeta.vectorStoreId];
        } else {
          const agg = await client.vectorStores.create({ name: `madison-agg-all-${Date.now()}` });
          await client.vectorStores.fileBatches.create(agg.id, { file_ids: allFileIds });
          await waitIndexing(client, agg.id);
          cache["__ALL_AGG__"] = { hash: combinedHash, vectorStoreId: agg.id, fileId: "" };
          writeCache(cache);
          effectiveVectorStoreIds = [agg.id];
        }
      }
    } else if (selectedBooks.length > 1) {
      const fileIds = selectedBooks
        .map((bk) => (cache[bk]?.fileId || ""))
        .filter((fid) => fid && typeof fid === "string");
      if (fileIds.length) {
        const agg = await client.vectorStores.create({ name: `madison-agg-${Date.now()}` });
        await client.vectorStores.fileBatches.create(agg.id, { file_ids: fileIds });
        await waitIndexing(client, agg.id);
        effectiveVectorStoreIds = [agg.id];
      }
    }

    // 基于问题中的实体优先检索匹配书籍（例如问题包含 “de lolme” 时优先用该书的单库）
    const qLower = (question || "").toLowerCase();
    const entityMatchedBook = selectedBooks.find((bk) => {
      const head = bk.split("--")[0].trim().toLowerCase(); // 取书名的前半部分（通常是作者或核心名）
      return head && qLower.includes(head);
    });
    if (selectedBooks.length < 3 && entityMatchedBook && cache[entityMatchedBook]?.vectorStoreId) {
      effectiveVectorStoreIds = [cache[entityMatchedBook].vectorStoreId];
    }

    // 使用 Responses API 进行检索回答（限定在所选书籍/聚合库的向量库上）
    if (!effectiveVectorStoreIds.length) {
      const msg = "抱歉，未找到所选书籍的向量库，请确认书名与 books/*.txt 一致或先运行预热脚本。";
      return NextResponse.json({ reply: msg });
    }
    const response = await client.responses.create({
      model: (model || process.env.OPENAI_MODEL || "gpt-4o-mini") as string,
      input: `Answer the user's question using only the selected context. Return a strict JSON object with keys: {"answer": string, "quotes": string[]}. The "quotes" array must include the exact snippet(s) from the context that support the answer. Do not include any text outside of that JSON object.\n\nUser question: ${question || ""}`,
      tools: [
        {
          type: "file_search",
          vector_store_ids: effectiveVectorStoreIds,
        },
      ],
    });
    // 解析 Responses API 输出
    const output = (response as any)?.output ?? [];
    let text = "";
    const sources: { book: string; fileId: string; quote: string }[] = [];
    for (const item of output) {
      if (item?.type === "message") {
        const content = item?.content ?? [];
        for (const c of content) {
          if (c?.type === "output_text") {
            const t = c?.text ?? "";
            if (t) text += (text ? "\n" : "") + t;
            const annotations = c?.annotations ?? [];
            if (Array.isArray(annotations)) {
              for (const ann of annotations) {
                if (ann?.type === "file_citation" && (ann?.file_id || ann?.file_citation?.file_id)) {
                  const fid = (ann?.file_id || ann?.file_citation?.file_id) as string;
                  const quote = (ann?.quote || ann?.file_citation?.quote || "") as string;
                  let book = "";
                  for (const [bk, meta] of Object.entries(readCache())) {
                    if ((meta as any).fileId === fid) { book = bk; break; }
                  }
                  sources.push({ book: book || "unknown", fileId: fid, quote });
                }
              }
            }
          }
        }
      }
    }
    // text = stripCitationMarkers(text);
    const uniqueSources = Array.from(new Map(sources.map((s) => [`${s.fileId}:${s.quote}`, s])).values());

    // 如果模型返回了 JSON 负载，优先采用其中的 answer 与 quotes
    const parsed = extractAnswerPayload(text);
    if (parsed?.answer) {
      text = parsed.answer;
    }
    if (parsed?.quotes && parsed.quotes.length > 0) {
      // 尝试将 quotes 与 citations 对齐（模糊匹配，忽略大小写/标点/空白差异）
      const normalizedSources = uniqueSources.map((s, i) => ({
        index: i,
        norm: normalizeQuote(s.quote || ""),
        original: s,
      }));
      const used = new Set<number>();
      const merged: { book: string; fileId: string; quote: string }[] = [];
      // 预先读取所选书籍的规范化全文内容，用于回退匹配
      const bookNormText: Record<string, string> = {};
      for (const bk of selectedBooks) {
        try {
          const fp = bookFilePath(bk);
          if (fs.existsSync(fp)) {
            const raw = fs.readFileSync(fp, "utf-8");
            bookNormText[bk] = normalizeQuote(stripCitationMarkers(raw));
          }
        } catch { }
      }
      for (const q of parsed.quotes) {
        const qnorm = normalizeQuote(q || "");
        let bestIdx = -1;
        let bestScore = 0;
        for (const cand of normalizedSources) {
          if (used.has(cand.index) || !cand.norm) continue;
          let score = 0;
          if (!qnorm) continue;
          if (cand.norm === qnorm) {
            score = 1;
          } else if (cand.norm.includes(qnorm) || qnorm.includes(cand.norm)) {
            score = 0.95;
          } else {
            score = jaccardSimilarity(cand.norm, qnorm);
          }
          if (score > bestScore) {
            bestScore = score;
            bestIdx = cand.index;
          }
        }
        if (bestIdx >= 0 && bestScore >= 0.5) {
          used.add(bestIdx);
          merged.push(uniqueSources[bestIdx]);
        } else {
          // 回退：通过全文包含关系尝试定位是哪本书
          let fallbackBook = "";
          for (const bk of selectedBooks) {
            const normText = bookNormText[bk] || "";
            if (qnorm && normText && normText.includes(qnorm)) {
              fallbackBook = bk;
              break;
            }
          }
          merged.push({ book: fallbackBook || (selectedBooks[0] || "unknown"), fileId: "", quote: q });
        }
      }
      // 用 JSON 的 quotes 驱动 sources 列表（保留顺序）
      uniqueSources.splice(0, uniqueSources.length, ...merged);
    }

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
