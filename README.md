# Form Studio

A local-first tax-form annotation studio built for the Instead full-stack
engineering exercise. It maps deeply nested taxpayer data onto precise PDF
regions, previews the result, and exports a flattened, filled PDF.

## What it demonstrates

- A versioned JSON annotation specification with normalized, zoom-independent
  geometry.
- RFC 6901 JSON Pointer bindings such as `/income/w2s/0/wages`.
- Multipage PDF viewing, upload, draw/move/resize interactions, and live
  formatting.
- Browser-local persistence, validated JSON import/export, undo/redo, and
  flattened PDF download.
- A typed Next.js validation route that never receives tax documents.
- Unit and browser smoke tests around the risky parts of the system.

## Run locally

Requirements: Node 20.16+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The official final 2025 IRS Form 1040 and sample
taxpayer data load automatically.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Architecture

The app has three independent inputs:

1. A bundled or user-selected PDF.
2. A versioned annotation template.
3. Arbitrarily nested taxpayer JSON.

PDF.js renders the source PDF. A normalized HTML overlay supplies field
interactions. The binding engine resolves JSON Pointers and applies shared
formatters. `pdf-lib` then converts normalized top-left coordinates to PDF
points and burns the same formatted values into a downloadable PDF.

Important modules:

- `src/lib/schema/annotation-schema.ts` — runtime and TypeScript contract.
- `src/lib/bindings/` — JSON Pointer resolution and value formatting.
- `src/lib/pdf/` — coordinate conversion and flattened PDF generation.
- `src/store/annotation-store.ts` — workspace state, history, and recovery.
- `docs/annotation-spec.md` — complete specification and extension points.

## Privacy model

PDFs and taxpayer JSON are processed in the browser. Uploaded PDFs are stored
in IndexedDB, project metadata is stored in local storage, and no tax document
is sent to the server. The API validation route accepts template metadata only.
JSON and PDF downloads happen directly in the browser.

For a production tax product, browser data would additionally need an explicit
retention policy, encrypted storage, content-security policy hardening, audit
events, and reviewed telemetry that cannot capture taxpayer values.

## Design rationale

Instead is the brand system of record: sand and white surfaces, charcoal
chrome, lime activity signals, Lato product typography, and Libre Baskerville
for editorial moments. Neo Mirai contributes only instrument-like craft:
hairline grids, mono coordinate labels, cardless inspector cells, and restrained
placement motion.

The result stays dense enough for professional form work while avoiding a
generic admin dashboard.

## Tradeoffs and next steps

- **Browser-only PDF work:** protects taxpayer data and deploys cleanly to
  Vercel, but large scanned PDFs are constrained by device memory.
- **Drawn overlays over AcroForm fields:** works across arbitrary forms and
  annual revisions, but does not preserve native PDF widgets.
- **Standard PDF fonts:** guarantees portable export; exact browser/PDF font
  metric parity is approximate.
- **Local persistence:** ideal for the exercise; production collaboration
  needs encrypted server storage, authentication, roles, and conflict handling.

Next extensions would add repeatable dependent/W-2 groups, conditional fields,
template migrations, OCR-assisted box suggestions, comments/review status,
and an immutable audit trail.

## Five-minute walkthrough

1. **0:00–0:35** — Explain template vs taxpayer data vs source PDF.
2. **0:35–1:30** — Draw, move, and resize a field; show normalized geometry.
3. **1:30–2:30** — Bind it to `/income/w2s/0/wages` and select currency.
4. **2:30–3:20** — Edit nested JSON and switch to Preview.
5. **3:20–4:10** — Export/import template JSON and download the filled PDF.
6. **4:10–5:00** — Cover privacy, coordinate conversion, tests, and repeat
   groups/collaboration as next steps.

## Deployment

The application is compatible with a standard Vercel Next.js deployment. No
database, environment variables, or external PDF service is required.