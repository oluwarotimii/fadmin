import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function GET(request: Request) {
  // Handle preflight for GET request
  if (request.method === "OPTIONS") {
    return handleAPICorsPreflight();
  }

  const response = Response.json({ message: "CORS test successful!", status: "ok" });
  return addAPICorsHeaders(response);
}

export async function POST(request: Request) {
  // Handle preflight for POST request
  if (request.method === "OPTIONS") {
    return handleAPICorsPreflight();
  }

  const data = await request.json();
  const response = Response.json({ 
    message: "CORS test post successful!", 
    received: data,
    status: "ok" 
  });
  return addAPICorsHeaders(response);
}