/**
 * Server API route: /api/feedback
 *
 * Appends feedback events to a local JSONL file under the `feedback/`
 * directory. Events include quick thumbs up/down actions and the
 * extended feedback payload collected from the modal. This is a
 * lightweight persistence mechanism suitable for development and
 * analysis; replace with a proper DB for production.
 */
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const FEEDBACK_DIR = path.join(process.cwd(), "feedback");
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, "feedbacks.jsonl");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const entry = {
      timestamp: new Date().toISOString(),
      payload: body,
    };

    if (!fs.existsSync(FEEDBACK_DIR)) {
      // Ensure the feedback directory exists. We use a synchronous
      // call because this code runs in a short-lived serverless
      // function and sequential writes are acceptable for development.
      fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    }

    fs.appendFileSync(FEEDBACK_FILE, JSON.stringify(entry) + "\n");

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("ERROR IN /api/feedback:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
