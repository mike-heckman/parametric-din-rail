# 0004 - Frontend: Native Web Viewer & Download Button

## Context
We are removing the `<iframe>` approach due to Onshape's `X-Frame-Options` restrictions and instead migrating to a native `<model-viewer>` approach for 3D rendering.

## Success Criteria
- In `public/index.html`, replace the Onshape `<iframe id="onshape-viewer">` with Google's `<model-viewer>` web component (`<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>`).
- The `<model-viewer>` component should be configured to fill the main container, enable camera controls, and auto-rotate.
- Constrain the UI to limit caching permutations:
  1. **Number of DIN Rails:** Set `min="1"`, `max="5"`, `step="1"`.
  2. **Spacing:** Convert to a Range Slider (`<input type="range">`) with `min="20"`, `max="100"`, `step="5"`. Add a visual span element next to it (e.g., `<span id="spacing-val">50 mm</span>`).
  3. **Head / Foot Distance:** Convert to Range Sliders with `min="0"`, `max="50"`, `step="10"`. Add visual spans next to them.
- Add an "Advanced Mode" section below the Generate button with the text: "Need exact millimeter precision? Open the full parametric model in Onshape." Link it to the provided Onshape document URL with `target="_blank"`.
- Add a new "Download STL" button to the sidebar UI (`#download-stl-btn`), alongside the existing "Generate Model" button.
- In `public/app.js`, attach `input` event listeners to update the visual readout spans in real-time as users drag the sliders.
- In `public/app.js`, the "Generate Model" button must send a POST request with an added parameter `format: 'glb'`. Update `<model-viewer>` `src` on a 200 OK.
- The "Download STL" button must send a POST request with `format: 'stl'`. Trigger a standard browser download using a temporary `<a>` tag on success.

## Implementation Details
- Ensure appropriate loading states (spinners) are shown on the UI while waiting for the Onshape API, since `.glb` generation can take 5-15 seconds on a cache miss.
- The exact Onshape Advanced Mode URL is: `https://cad.onshape.com/documents/e51df0b3cf2731be65ff4d8a/w/8f0f27d4c05cb541755b75f0/e/d8c5042a0e7c60372ca8a3fe?configuration=BackFootDIN%3Dfalse%3BBackFootDepth%3D0.001%2Bmeter%3BCount%3D1.0%3BExtraBottom%3D0.0%2Bmeter%3BExtraTop%3D0.0%2Bmeter%3BFootPadHeight%3D0.01%2Bmeter%3BFrontFootDIN%3Dfalse%3BFrontFootDepth%3D0.045%2Bmeter%3BGap%3D0.06%2Bmeter%3BIncludeFoot%3Dfalse&renderMode=0&uiState=6a5e5625b13ce118680d41d9`
