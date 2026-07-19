import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const sigHeader = request.headers.get("YCloud-Signature");

  const bodyHash = createHash("sha256").update(rawBody).digest("hex");

  const response = {
    received: {
      bodyLength: rawBody.length,
      bodyHash,
      bodyStart: rawBody.substring(0, 50),
      bodyEnd: rawBody.substring(Math.max(0, rawBody.length - 50)),
      sigHeader: sigHeader || "(none)",
      sigHeaderLength: sigHeader?.length || 0,
      sigStart: sigHeader ? sigHeader.substring(0, 30) : "(none)",
      allHeaderKeys: Array.from(request.headers.keys()),
    },
  };

  return NextResponse.json(response);
}
