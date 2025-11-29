# CORS Configuration Guide

This document explains how Cross-Origin Resource Sharing (CORS) is configured in the FAdmin application to allow cross-origin requests from browsers.

## Implementation Approach

CORS is implemented using multiple layers to ensure proper handling across all routes:

1. **Next.js Configuration**: `next.config.ts` adds CORS headers at the application level
2. **Middleware**: `middleware.ts` adds CORS headers for all non-static routes
3. **API Routes**: Individual API routes handle CORS with preflight requests

## Headers Applied

The following CORS headers are applied:

- `Access-Control-Allow-Origin: *` - Allows requests from any origin
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS` - Permits standard HTTP methods
- `Access-Control-Allow-Headers: Content-Type, Authorization, Set-Cookie` - Allows specific headers
- `Access-Control-Allow-Credentials: true` - Allows credentials to be sent with requests

## API Routes

All API routes in `/app/api/` include:

- An `OPTIONS` export for handling preflight requests
- CORS headers added to all responses using the `addAPICorsHeaders` utility
- Preflight handling within each route function

## Testing

A test endpoint is available at `/api/test` to verify CORS configuration.

## Security Note

The current configuration allows any origin (*) for development purposes. For production, consider restricting this to specific domains.