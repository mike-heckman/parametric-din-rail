# Software Design Document: Onshape Parametric Model Configurator

## Overview
The goal of this project is to provide a public-facing custom web configurator for a parametric "DIN Rail Rack" 3D model hosted on Onshape. The application allows users to manipulate parameters (e.g., number of rails, spacing, foot pad height) and see the updated model in real-time.

## Architecture

The system follows a lightweight, serverless architecture hosted entirely on Cloudflare:

1. **Frontend (Cloudflare Pages)**
   - **Stack:** HTML, Vanilla CSS (Dark Theme), Vanilla JavaScript.
   - **Responsibility:** Render the control panel and host the embedded Onshape 3D viewer `<iframe>`. Capture user input and submit configuration update requests.
   - **Design Rationale:** A Single Page Application (SPA) approach using vanilla technologies minimizes build complexity and leverages Cloudflare Pages' static hosting capabilities effectively.

2. **Backend Proxy (Cloudflare Functions)**
   - **Stack:** JavaScript (Cloudflare Workers environment).
   - **Responsibility:** Act as a secure proxy between the frontend and the Onshape REST API.
   - **Security:** Hides Onshape API credentials (`ONSHAPE_ACCESS_KEY`, `ONSHAPE_SECRET_KEY`) from the client. Implements Onshape's required custom HMAC-SHA256 request signing process before forwarding the payload.

3. **External Service (Onshape API)**
   - **Responsibility:** Receives configuration updates from the Cloudflare Function, regenerates the 3D model, and serves the updated visual geometry back to the frontend's iframe.

## Security & Environment Variables
- **API Keys:** Never exposed to the frontend or committed to source control. They are stored securely in Cloudflare Pages Secrets for production/preview environments.
- **Local Testing:** Credentials and targeting variables are read from a `.dev.vars` file (ignored by `.gitignore`) when using the `wrangler` CLI for local development.

The following variables are required in the environment:
- `ONSHAPE_ACCESS_KEY`
- `ONSHAPE_SECRET_KEY`
- `ONSHAPE_DOCUMENT_ID`
- `ONSHAPE_WORKSPACE_ID`
- `ONSHAPE_ELEMENT_ID`

## Data Flow
1. User adjusts a numeric input or checkbox on the frontend UI.
2. User clicks "Generate Model".
3. Frontend JavaScript collects the inputs and sends a `POST` request to `/api/onshape`.
4. The Cloudflare Function (`functions/api/onshape.js`) receives the request.
5. The Function generates an HMAC-SHA256 signature using the `ONSHAPE_SECRET_KEY` and constructs the `Authorization` header.
6. The Function sends the configuration update request to the Onshape API.
7. Upon successful response from Onshape, the Cloudflare Function responds to the frontend with a 200 OK.
8. The frontend JavaScript refreshes the Onshape viewer `<iframe>` to reflect the new configuration.

## User Interface Requirements
The control panel must include:
- **Numeric Inputs:** Number of DIN Rails, Spacing (distance between rails), Head distance, Foot distance, Foot pad height.
- **Checkboxes:** Include freestanding foot, Include front foot DIN rail, Include back foot DIN rail.
- **Action:** "Generate Model" submit button.
- **Feedback:** A loading state indicator during API requests.
