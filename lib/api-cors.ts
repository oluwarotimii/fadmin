import { NextResponse } from "next/server";

// Add CORS headers to API responses
export function addAPICorsHeaders(response: Response) {
  // For regular Response objects
  if (response.headers) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Set-Cookie");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return response;
}

// Handle CORS preflight for API routes
export async function handleAPICorsPreflight() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Set-Cookie",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

// Generic API route wrapper that adds CORS headers
export function withCORS(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    if (request.method === "OPTIONS") {
      return handleAPICorsPreflight();
    }
    
    const response = await handler(request);
    return addAPICorsHeaders(response);
  };
}