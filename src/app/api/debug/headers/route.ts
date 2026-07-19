import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const allHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    allHeaders[key] = value;
  });

  const body = await request.text();

  return NextResponse.json({
    headers: allHeaders,
    bodyLength: body.length,
    bodyPreview: body.substring(0, 200),
    timestamp: new Date().toISOString(),
  });
}
