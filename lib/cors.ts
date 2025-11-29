import { NextResponse } from "next/server";

export function addCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Set-Cookie");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export function handleCorsPreflight(request: Request) {
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Set-Cookie",
        "Access-Control-Allow-Credentials": "true",
      },
    });
    return response;
  }
  return null;
}