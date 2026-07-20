# Parametric DIN Rail Rack Configurator

A web-based 3D configurator for a parametric "DIN Rack Rail" model hosted on Onshape.

## Architecture

This project uses a serverless architecture hosted entirely on Cloudflare:

- **Frontend (Cloudflare Pages):** HTML, CSS (Vanilla Dark Theme), Vanilla JS, and Google's `<model-viewer>` component for native 3D web rendering.
- **Backend (Cloudflare Functions & R2):** Acts as a secure proxy to the Onshape REST API. It authenticates requests using HMAC-SHA256 signatures, triggers asynchronous GLTF/STL exports from an immutable Onshape Version, and implements read-through caching via a Cloudflare R2 bucket to protect API quotas.
- **Onshape API:** Handles 3D model translations (GLTF for viewing, STL for 3D printing) based on parametric configuration strings.

## Development

Install dependencies:
```bash
npm install
```

Configure your local environment by creating a `.dev.vars` file in the root directory:
```
ONSHAPE_ACCESS_KEY=your_access_key
ONSHAPE_SECRET_KEY=your_secret_key
ONSHAPE_URL=https://cad.onshape.com/documents/{document_id}/v/{version_id}/e/{element_id}
```
(See `.dev.vars.example` for a template. Make sure `.dev.vars` is added to `.gitignore` and never committed.)

Run locally:
```bash
npx wrangler pages dev public
```

### Production Deployment (Cloudflare Pages)

When deploying to Cloudflare Pages, your API keys must be securely stored. **Never commit them to source control.**

1. Go to the Cloudflare dashboard and select your Pages project.
2. Navigate to **Settings** > **Environment variables**.
3. Under **Production** (and optionally **Preview**), add the keys (`ONSHAPE_ACCESS_KEY`, `ONSHAPE_SECRET_KEY`, `ONSHAPE_URL`).
4. Ensure the sensitive values are saved as encrypted variables to prevent them from being viewed again.
