# Software Design Document: Onshape Parametric Model Configurator

## Overview
The goal of this project is to provide a public-facing custom web configurator for a parametric "DIN Rail Rack" 3D model hosted on Onshape. The application allows users to manipulate parameters (e.g., number of rails, spacing, foot pad height) and see the updated model in real-time.

## Architecture

The system follows a lightweight, serverless architecture hosted entirely on Cloudflare:

1. **Frontend (Cloudflare Pages)**
   - **Stack:** HTML, Vanilla CSS (Dark Theme), Vanilla JavaScript, Google `<model-viewer>`.
   - **Responsibility:** Render the control panel and host the embedded `<model-viewer>` component. Capture user input, request generated `.glb` models, and provide `.stl` download options.
   - **Design Rationale:** A Single Page Application (SPA) approach using vanilla technologies and `<model-viewer>` provides a native, premium 3D experience without relying on third-party iframes that are often blocked.

2. **Backend Proxy & Cache (Cloudflare Functions + R2)**
   - **Stack:** JavaScript (Cloudflare Workers environment), Cloudflare R2 Bucket.
   - **Responsibility:** Act as a secure proxy between the frontend and the Onshape REST API, and aggressively cache exported geometries.
   - **Security:** Hides Onshape API credentials (`ONSHAPE_ACCESS_KEY`, `ONSHAPE_SECRET_KEY`) from the client. Implements Onshape's required custom HMAC-SHA256 request signing process.
   - **Caching:** Generates a deterministic SHA-256 hash of requested configurations. Checks the R2 bucket for a cache hit before invoking the Onshape API, drastically reducing API calls against the 2,500/year limit.

3. **External Service (Onshape API)**
   - **Responsibility:** Receives configuration updates from the Cloudflare Function, translates the 3D model into `.glb` (for web) or `.stl` (for print), and serves the resulting files back to the proxy for caching and delivery.

## Security & Environment Variables
- **API Keys:** Never exposed to the frontend or committed to source control. They are stored securely in Cloudflare Pages Secrets for production/preview environments.
- **Local Testing:** Credentials and targeting variables are read from a `.dev.vars` file (ignored by `.gitignore`) when using the `wrangler` CLI for local development.

The following variables are required in the environment:
- `ONSHAPE_ACCESS_KEY`
- `ONSHAPE_SECRET_KEY`
- `ONSHAPE_URL`: The full URL to a specific Onshape Version (e.g., `https://cad.onshape.com/documents/{did}/v/{vid}/e/{eid}`). The Cloudflare Function parses this URL to extract the Document ID, Version ID, and Element ID.

## Data Flow
1. User adjusts a numeric input or checkbox on the frontend UI.
2. User clicks "Generate Model" (requests `.glb`) or "Download STL" (requests `.stl`).
3. Frontend JavaScript collects the inputs and sends a `POST` request to `/api/onshape`.
4. The Cloudflare Function (`functions/api/onshape.js`) validates the bounds of the input and creates a deterministic SHA-256 hash.
5. The Function checks the attached Cloudflare R2 bucket (`MODEL_CACHE`) for a file matching the hash.
6. **Cache Hit:** The Function returns the cached file from R2 directly to the frontend.
7. **Cache Miss:**
   - The Function parses `env.ONSHAPE_URL` to extract the Document ID, Version ID, and Element ID.
   - The Function formats the user inputs into an Onshape configuration string (e.g., `Rails=3;Spacing=0.05+meter`).
   - The Function signs the request with HMAC-SHA256 and calls the Onshape Translation API on the Version endpoint (`POST /api/partstudios/d/{did}/v/{vid}/e/{eid}/translations`), passing the configuration string in the payload.
   - The Function polls the translation status until complete, then downloads the file.
   - The Function saves the downloaded file into the R2 bucket using the hash.
   - The Function returns the file to the frontend.
8. The frontend JavaScript loads the new `.glb` into `<model-viewer>` or triggers a browser download for the `.stl`.

## User Interface Requirements
The control panel must include:
- **Restricted Inputs (to maximize cache hits):**
  - Number of DIN Rails: Bounded input (min=1, max=5, step=1).
  - Spacing (distance between rails): Range Slider (`<input type="range">`) with min=20, max=100, step=5, including a live visual readout (e.g., "35 mm").
  - Head/Foot distance: Range Sliders with step=10 (min=0, max=50), including a live visual readout.
  - Foot pad height: Bounded numeric input.
- **Checkboxes:** Include freestanding foot, Include front foot DIN rail, Include back foot DIN rail.
- **Action Buttons:** "Generate Model" (for the `.glb` viewer) and "Download STL" (for 3D printing).
- **Advanced Mode:** A text link beneath the buttons opening the Onshape document in a new tab (`target="_blank"`) for exact millimeter precision.
- **Feedback:** A loading state indicator during API requests.

> **Security & Caching Constraint:** The Cloudflare Function proxy MUST explicitly validate and enforce these bounded limits and step intervals before generating the cache hash. This prevents malicious actors from bypassing the UI, submitting arbitrary values (e.g., `31.42`), and exploding our cache permutations or exhausting the Onshape API limits.
