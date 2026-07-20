# Parametric DIN Rail Rack Configurator

A web-based 3D configurator for a parametric "DIN Rack Rail" model hosted on Onshape.

## Architecture

This project uses a serverless architecture hosted entirely on Cloudflare:

- **Frontend (Cloudflare Pages):** HTML, CSS (Vanilla Dark Theme), and Vanilla JS.
- **Backend (Cloudflare Functions):** Acts as a secure proxy to the Onshape REST API.
- **Onshape API:** Handles 3D model generation and updates based on parametric inputs.

## Development

Install dependencies:
```bash
npm install
```

Run locally:
```bash
npx wrangler pages dev public
```
