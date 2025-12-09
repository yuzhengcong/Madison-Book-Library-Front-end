/**
 * Server API route: /api/onboarding
 *
 * Receives onboarding events (consent and anonymous demographics)
 * and persists them as JSONL lines under `feedback/onboarding.jsonl`.
 * The data stored is intentionally minimal and anonymous; adjust the
 * fields and storage policy according to privacy requirements.
 */
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const entry = { ...body, ts: new Date().toISOString() };

    const feedbackDir = path.join(process.cwd(), "feedback");
    try {
      if (!fs.existsSync(feedbackDir)) fs.mkdirSync(feedbackDir, { recursive: true });
    } catch (e) {}

    const file = path.join(feedbackDir, "onboarding.jsonl");
    try {
      fs.appendFileSync(file, JSON.stringify(entry) + "\n");
    } catch (e) {
      // swallow
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
