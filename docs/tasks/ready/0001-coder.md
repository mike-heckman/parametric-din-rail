# 0001 - Project Setup & Frontend Scaffold

## Success Criteria
- `package.json` is created with `wrangler` installed as a dev dependency.
- `README.md` is created with basic project documentation.
- `public/index.html` is created and contains:
  - Numeric Inputs: Number of DIN Rails, Spacing, Head distance, Foot distance, Foot pad height.
  - Checkboxes: Include freestanding foot, Include front foot DIN rail, Include back foot DIN rail.
  - A "Generate Model" button.
  - A loading state indicator.
  - An embedded `<iframe>` for the Onshape 3D viewer.
- `public/style.css` is created (dark theme, no build framework required).
- `public/app.js` is created to collect inputs and handle form submission.

## Implementation Details
1. Run `npm init -y` and `npm install wrangler --save-dev`.
2. Create `README.md` explaining the project architecture (Cloudflare Pages + Functions + Onshape).
3. Scaffold `public/` directory with HTML/CSS/JS.
4. Ensure the design utilizes a modern dark mode aesthetic as per the user's request.
5. The frontend should just log the POST payload for now or send it to `/api/onshape` (which will be implemented next).
