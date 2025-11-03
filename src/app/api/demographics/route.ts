import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { occupation, ageRange, userAgent } = body || {};

    if (typeof occupation !== "string" || typeof ageRange !== "string") {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const ts = new Date().toISOString();
    // 这里仅做示例记录。实际可写入数据库或分析工具。
    console.log("[demographics]", { occupation, ageRange, userAgent, ts });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}