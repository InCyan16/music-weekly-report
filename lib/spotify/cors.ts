import { NextRequest, NextResponse } from "next/server";

const DEMO_ORIGINS = [
  "http://localhost:3456",
  "http://127.0.0.1:3456",
];

export function withDemoCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin");
  if (origin && DEMO_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return response;
}

export function corsPreflightResponse(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return withDemoCors(request, response);
}
