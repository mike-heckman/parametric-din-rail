# ADR 0001: Native Web Viewer and R2 Caching Strategy

## Context
Onshape's `X-Frame-Options: SAMEORIGIN` policy prevents embedding their native 3D viewer via `<iframe>` in our custom web application. To maintain a headless, seamless UX for non-CAD users, we cannot redirect users to Onshape. Furthermore, the Onshape Free Tier limits API calls to 2,500/year, requiring an aggressive caching strategy.

## Decision
1. **Frontend Viewer:** We will replace the Onshape iframe with Google's `<model-viewer>` web component.
2. **Asset Format:** The backend will request lightweight `.glb` formats for web rendering, while maintaining a separate capability for `.stl` downloads for 3D printing.
3. **Caching Layer:** We will implement Cloudflare R2 as a read-through cache.
   - The backend will generate a deterministic SHA-256 hash of the configuration string (e.g., `Rails=3;Spacing=10...`).
   - The hash will be used as the R2 object key (e.g., `rack-[hash].glb`).
   - On a cache miss, the backend will call Onshape, download the generated file, store it in R2, and return it.
   - On a cache hit, the file is served directly from R2, bypassing the Onshape API completely.

## Consequences
### Pros
- Seamless, embedded UX that keeps users on our domain.
- Drastic reduction in Onshape API calls, protecting our 2,500/year limit.
- Very fast subsequent loads for previously generated configurations.

### Cons
- Increased backend complexity (managing Onshape translation API polling and R2 bindings).
- Storage costs for Cloudflare R2 (generous free tier exists).

### Technical Debt
- We must implement and maintain an Onshape translation status polling mechanism, as exporting a `.glb` or `.stl` is an asynchronous process in the Onshape API.
