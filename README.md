# Instead Form Annotator

Annotate boxes on a U.S. tax PDF, bind them to nested taxpayer JSON, preview
the fill, and export a flattened PDF.

Built for the Instead full-stack engineering exercise.

## What this solves

Tax forms need a reusable mapping from **structured return data** onto
**specific boxes** on a PDF — including nested objects and arrays — without
baking values into the template.

Form Studio separates:

1. **Taxpayer JSON** — the data
2. **Annotation template** — where boxes live + how to format values
3. **PDF** — the blank form

## Core architecture

```text
JSON Data
    ↓
JSON Pointer
    ↓
Annotation Specification
    ↓
PDF Renderer
    ↓
Filled Tax Form
```

Annotations store a **path** (`/income/w2s/0/wages`), not the value itself.
Preview and Export resolve that path against the **current** data at render
time. Edit the JSON → the filled form updates.

## Annotation format

Each field includes:

- `id`, `name`, `page`
- `rect` — normalized 0–1 geometry (top-left origin)
- `type` — text / currency / ssn / …
- `binding.pointer` — JSON Pointer into the data
- `format` + `appearance` — shared by preview and export

Full field list and schema: [`docs/annotation-spec.md`](docs/annotation-spec.md)

## Example

Annotation:

```json
{
  "id": "taxpayer-first-name",
  "name": "Taxpayer first name",
  "page": 1,
  "rect": { "x": 0.074, "y": 0.115, "width": 0.23, "height": 0.021 },
  "type": "text",
  "binding": { "pointer": "/taxpayer/name/first" }
}
```

Data:

```json
{ "taxpayer": { "name": { "first": "Mayank" } } }
```

```text
/taxpayer/name/first  →  "Mayank"  →  drawn in that PDF rectangle
```

## Coordinate system

Boxes are stored as fractions of page width/height (0–1), origin top-left.
At export, they convert to PDF points (origin bottom-left):

```text
pdfX = rect.x × W
pdfY = H - (rect.y + rect.height) × H
```

Zoom and page size do not break saved templates.

## Data binding

Uses [RFC 6901 JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901):

- `/taxpayer/name/first` — nested object
- `/income/w2s/0/wages` — array index `0`
- Missing paths show a binding error in the UI; export uses `fallback`

## Formatting

```json
{ "type": "currency", "format": { "locale": "en-US", "currency": "USD" } }
```

`128450.75` → `$128,450.75`

```json
{ "type": "ssn" }
```

`"123456789"` → `123-45-6789`

## Validation

Zod validates templates on import. `POST /api/templates/validate` exposes the
same check over HTTP. The route never receives PDFs or taxpayer JSON.

## Running locally

Node 20.16+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Bundled 2025 Form 1040 + sample data load by
default. Workflow in the app: **Data → Annotate → Preview**.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Design decisions

- **Normalized geometry** — survives zoom / page size changes
- **JSON Pointer** — clean nested + array access vs dotted paths
- **Draw text with pdf-lib** — works even when the PDF has no AcroForm fields
- **Client-only documents** — PII stays in the browser for this exercise

## Limitations / future enhancements

Not built: repeat groups, conditional fields, shared templates, OCR
suggestions, native AcroForm writing. See the spec for details.

## Video walkthrough

≤5 minute Loom covering:

1. Data → Pointer → Annotation → PDF
2. Draw / bind a field
3. Edit JSON and show Preview update
4. Export filled PDF + template JSON
5. Coordinate choice + what was deferred

## Deploy

Standard Vercel Next.js deploy. No env vars or database required.
