import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const sigHeader = request.headers.get("YCloud-Signature");

  const bodyHash = createHash("sha256").update(rawBody).digest("hex");

  return NextResponse.json({
    debug: {
      timestamp: new Date().toISOString(),
      bodyLength: rawBody.length,
      bodyHash,
      bodyStart: rawBody.substring(0, 60),
      sigHeader: sigHeader ? sigHeader.substring(0, 50) + "..." : "(none)",
      sigHeaderFull: sigHeader,
      contentType: request.headers.get("Content-Type"),
    },
  });
}
