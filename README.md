# Rhombus Bandwidth Calculator

A dependency-free browser calculator for estimating Rhombus camera upload bandwidth by location. It separates sustained traffic, busy-hour peak, encoder saturation, monthly transfer, and the recommended ISP upload tier.

## Model basis

- Encoder ceilings come from `VIDEO_AGENT_LOG` dash-quality transitions collected from one online unit of each of 17 models.
- Activity factors and peak ratios come from a seven-day hourly export covering 41 cameras and seven DR40 readers; 40 cameras contributed to the activity bands.
- Cloud archiving, scene activity, video-source count, timelapse, and selected AI features feed the estimate.
- The 30% sizing reserve covers protocol overhead and retransmits. It does not reserve bandwidth for unrelated site traffic.
- AI feature overhead remains an unvalidated estimate and is shown that way in the interface and exports.

Measured constants and their detailed provenance live in `model.js`. Update them only when the underlying production evidence is re-derived. The pages under `design/` are archived design explorations and use an older model; they are not production calculators.

## Development

The production page is intentionally framework-free:

- `index.html` contains semantic page structure.
- `app.css` contains screen and print presentation.
- `model.js` owns data, calculations, persistence, and migrations.
- `export-utils.js` safely encodes spreadsheet exports.
- `ui.js` owns rendering and browser interactions.

Run the complete validation suite with:

```sh
npm test
npm run check
```

Serve the directory over HTTP for browser validation; direct `file://` previews are not representative of deployment routing.

## Saved projects

Current projects use the `bw-project-v3` local-storage schema. The loader migrates v1 index-based camera records and v2 model-keyed records. Site features are stored once per location, while a camera feature value of `null` means “inherit the site setting.”
