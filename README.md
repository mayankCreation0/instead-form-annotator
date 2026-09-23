# Form Studio

Annotate fields on a tax PDF, bind them to nested JSON, preview the fill, and
export a flattened PDF. Built for the Instead full-stack exercise.

## Run

Node 20.16+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Loads the 2025 Form 1040 and sample taxpayer
data by default. You can also upload your own PDF.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## How it works

Three inputs:

1. PDF (bundled 1040 or upload)
2. Annotation template (where boxes are + how to format values)
3. Taxpayer JSON (arbitrary nesting)

PDF.js draws the page. An HTML overlay handles draw/move/resize. Bindings use
JSON Pointers (`/income/w2s/0/wages`). Preview and export share the same
formatters. `pdf-lib` burns the text into a downloadable PDF.

| Path | Role |
|------|------|
| `src/lib/schema/` | Template schema (Zod) |
| `src/lib/bindings/` | Pointer resolve + formatting |
| `src/lib/pdf/` | Coordinates + export |
| `src/store/` | State, undo/redo, localStorage |
| `docs/annotation-spec.md` | Spec details |

Everything stays in the browser. IndexedDB holds uploaded PDFs; localStorage
holds the template. There's a `/api/templates/validate` route if you want
server-side schema checks — it never sees the PDF or return data.

## Decisions I made

- **Normalized 0–1 boxes** instead of absolute points so zoom / page size
  don't break mappings.
- **JSON Pointer** over dotted paths — handles array indexes and keys with
  dots cleanly.
- **Draw text with pdf-lib** instead of filling AcroForm fields — works on
  forms that don't ship widgets (most IRS PDFs year to year).
- **No backend for documents** — fine for the exercise; a real product would
  need auth + encrypted storage.

Not built yet: repeat groups (dependents / W-2s), conditional fields, shared
templates, OCR suggestions.

## Deploy

Standard Vercel Next.js deploy. No env vars or database required.
