import 'dotenv/config';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}

const client = new OpenAI({ apiKey: API_KEY });

const booksDir = path.join(process.cwd(), 'src', 'app', 'api', 'chat', 'books');
const cacheFp = path.join(process.cwd(), 'src', 'app', 'api', 'chat', '.vector_cache.json');

function hashFile(fp) {
  const buf = fs.readFileSync(fp);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function readCache() {
  try {
    if (!fs.existsSync(cacheFp)) return {};
    const raw = fs.readFileSync(cacheFp, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}
function writeCache(cache) {
  try {
    fs.writeFileSync(cacheFp, JSON.stringify(cache, null, 2), 'utf-8');
  } catch {}
}

async function waitIndexing(vectorStoreId, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const list = await client.vectorStores.files.list(vectorStoreId);
    const allDone = list.data.every((f) => f.status === 'completed');
    if (allDone) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function main() {
  const files = fs.readdirSync(booksDir).filter((f) => f.endsWith('.txt'));
  const cache = readCache();
  console.log(`Found ${files.length} book files`);

  for (const fname of files) {
    const label = fname.replace(/\.txt$/,'');
    const fp = path.join(booksDir, fname);
    const h = hashFile(fp);
    const cached = cache[label];

    if (cached && cached.hash === h && cached.vectorStoreId) {
      console.log(`[skip] ${label} already indexed -> ${cached.vectorStoreId}`);
      continue;
    }

    console.log(`[create] vector store for ${label}`);
    const vs = await client.vectorStores.create({ name: `madison-${label}-${Date.now()}` });
    console.log(`[upload] ${label}`);
    const file = await client.files.create({ file: fs.createReadStream(fp), purpose: 'assistants' });
    // attach via fileBatches to avoid signature mismatch
    await client.vectorStores.fileBatches.create(vs.id, { file_ids: [file.id] });
    console.log(`[indexing] wait for ${label}`);
    await waitIndexing(vs.id);

    cache[label] = { hash: h, vectorStoreId: vs.id, fileId: file.id };
    writeCache(cache);
    console.log(`[done] ${label} -> ${vs.id}`);
  }

  console.log('All done. Cache saved at', cacheFp);
}

main().catch((e) => {
  console.error('Prewarm failed:', e?.message || e);
  process.exit(1);
});