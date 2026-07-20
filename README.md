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
ONSHAPE_URL=https://cad.onshape.com/documents/{did}/v/{vid}/e/{eid}
```

Run locally:
```bash
npx wrangler pages dev public
```
