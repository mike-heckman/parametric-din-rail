# 0005 - Backend: R2 Caching & Onshape Translation API

## Context
To protect our 2,500/year API limits and handle the `.glb`/`.stl` exports requested by the frontend, we must implement Cloudflare R2 as a read-through cache and integrate with Onshape's asynchronous translation endpoints.

## Success Criteria
- `wrangler.toml` is updated with an R2 bucket binding named `MODEL_CACHE` (bucket_name = "din-rail-cache").
- `functions/api/onshape.js` is rewritten to accept the `format` parameter (`glb` or `stl`) from the frontend payload.
- **URL Parsing:** The function extracts the Document ID (`did`), Version ID (`vid`), and Element ID (`eid`) from `env.ONSHAPE_URL` using a regex (e.g., `/documents\/([^\/]+)\/v\/([^\/]+)\/e\/([^\/]+)/`).
- **Backend Validation:** The function MUST explicitly snap/enforce the input values to match the frontend restrictions before doing any hashing or API calls:
  - Number of Rails: Enforce min 1, max 5, integer.
  - Spacing: Enforce min 20, max 100, snapped to nearest 5.
  - Head/Foot distance: Enforce min 0, max 50, snapped to nearest 10.
- The function generates a SHA-256 hash of the validated/snapped configuration payload and format to create a deterministic filename (e.g., `hash.glb` or `hash.stl`).
- The function checks `env.MODEL_CACHE.get(filename)`. If it exists, it returns the public URL of the cached file immediately.
- On a cache miss, the function:
  1. Formats the validated input into an Onshape configuration string (e.g. `Count=2.0;Gap=0.05+meter`).
  2. Signs the request and calls the Onshape Translation API using the Version endpoint (`POST /api/partstudios/d/{did}/v/{vid}/e/{eid}/translations`), passing the configuration string in the request payload. Note: We no longer do a separate configuration update step.
  3. Polls the Onshape Translation Status API until the `requestState` is `DONE`.
  4. Downloads the translated file from Onshape.
  5. Puts the file into the R2 bucket (`env.MODEL_CACHE.put(filename, data)`).
  6. Returns the R2 URL to the frontend.

## Implementation Details
- Since Onshape Versions (`/v/`) are immutable, you CANNOT update the configuration via a separate API call. You must pass the `configuration` parameter directly in the payload of the Translation API request.
- Onshape's translation API is asynchronous. You must poll `GET /api/translations/{translationId}` until it completes.
- GLTF exports should request `formatName: "GLTF"`. STL exports should request `formatName: "STL"`.
- Use the Web Crypto API (`crypto.subtle.digest`) to generate the SHA-256 hash of the configuration JSON string.
