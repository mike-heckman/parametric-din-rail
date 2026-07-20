# 0003 - Wrangler Config & Environment Setup

## Success Criteria
- `wrangler.toml` is created at the project root, pointing to the `public` directory for pages hosting.
- A `.dev.vars.example` file is created demonstrating which keys need to be set (`ONSHAPE_ACCESS_KEY`, `ONSHAPE_SECRET_KEY`, `ONSHAPE_DOCUMENT_ID`, `ONSHAPE_WORKSPACE_ID`, `ONSHAPE_ELEMENT_ID`).
- Documentation inside the `README.md` is updated to explain how to store these securely in Cloudflare Pages via the dashboard, and how to use `.dev.vars` for local development.

## Implementation Details
- Provide clear commands in the README for how to run `wrangler pages dev public`.
- Do not check `.dev.vars` into the repository; ensure it's in `.gitignore`.
- Explain how to configure Cloudflare secure storage (Secrets) for the API Keys.
