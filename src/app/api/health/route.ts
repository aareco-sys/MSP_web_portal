import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Healthcheck para el proxy / CloudFront / CI (no requiere auth ni ClickUp). */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
