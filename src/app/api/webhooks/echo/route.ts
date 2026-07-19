import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    const crypto = require("crypto");

    const bodyHash = crypto
      .createHash("sha256")
      .update(rawBody)
      .digest("hex");

    console.log("[echo] Webhook received:", {
      method: request.method,
      path: request.nextUrl.pathname,
      bodyLength: rawBody.length,
      bodyHash,
      headers: {
        contentType: headers["content-type"],
        contentLength: headers["content-length"],
        yCloudSignature: headers["ycloud-signature"]
          ? headers["ycloud-signature"].substring(0, 40) + "..."
          : "MISSING",
      },
    });

    return NextResponse.json({
      received: true,
      bodyLength: rawBody.length,
      bodyHash,
      bodyPreview: rawBody.substring(0, 100),
      headers,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[echo] Error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
