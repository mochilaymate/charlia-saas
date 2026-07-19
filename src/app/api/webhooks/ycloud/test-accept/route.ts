import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const sigHeader = request.headers.get("YCloud-Signature");

  // Accept any webhook without verification (for testing)
  console.log("[test-accept] Webhook received", {
    bodyLength: rawBody.length,
    hasHeader: !!sigHeader,
  });

  return NextResponse.json({ received: true });
}
