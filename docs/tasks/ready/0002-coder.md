# 0002 - Cloudflare Function Proxy (Onshape API)

## Success Criteria
- `functions/api/onshape.js` is created and correctly handles POST requests.
- The function reads `ONSHAPE_ACCESS_KEY` and `ONSHAPE_SECRET_KEY` from the Cloudflare env context.
- The function reads `ONSHAPE_DOCUMENT_ID`, `ONSHAPE_WORKSPACE_ID`, and `ONSHAPE_ELEMENT_ID` from the Cloudflare env context.
- The function implements Onshape's required HMAC-SHA256 request signing using the secret key, generating the `Authorization` header.
- The function correctly forwards the payload received from the frontend to the Onshape API Configuration update endpoint.
- Returns a successful response back to the frontend so it can refresh the iframe.

## Implementation Details
- Ensure the Cloudflare function only accepts POST requests.
- Use the Web Crypto API (`crypto.subtle`) available in Cloudflare Workers to generate the HMAC-SHA256 signature for the `Authorization: Onshape [AccessKey]:[Signature]` header.
- Onshape's signature process requires hashing the request method, URL path, query string, headers (Date and Nonce), and the request body content type.
- The configuration payload should match what Onshape expects for updating variables on an element.
