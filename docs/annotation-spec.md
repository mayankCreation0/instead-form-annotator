# Annotation specification

Version `1.0.0`

This document defines how Form Studio maps nested taxpayer data onto a PDF.

## Pipeline

```text
Taxpayer JSON
     ↓
JSON Pointer          (binding.pointer)
     ↓
Annotation Field      (id, name, page, rect, type, format, appearance)
     ↓
Position + Formatting
     ↓
Rendered PDF          (preview canvas or exported file)
```

Important:

- An **annotation stores a path**, not a copied value.
- Values are resolved from the **current** taxpayer JSON at render / export time.
- Change the JSON → Preview and Export update automatically.
- Rename a field's display `name` → only the label changes; the printed value does not.

## What an annotation is

An annotation field is one box on one page of a form, plus instructions for
how to fill it.

| Property | Meaning |
|----------|---------|
| `id` | Stable unique id (`taxpayer-first-name`) |
| `name` | Human label in the UI (does **not** print on the PDF) |
| `page` | 1-based page index |
| `rect` | Normalized box on that page (`x`, `y`, `width`, `height` in 0–1) |
| `type` | How to format the value: `text`, `currency`, `number`, `date`, `ssn`, `ein`, `checkbox`, `radio` |
| `binding.pointer` | JSON Pointer into the taxpayer data |
| `binding.fallback` | Used when the pointer is missing (export / empty preview) |
| `format` | Locale, currency code, date style, checkbox glyphs |
| `appearance` | Font, size, color, alignment, overflow |
| `required` / `hidden` | Metadata for tooling |

## End-to-end example

Annotation:

```json
{
  "id": "taxpayer-first-name",
  "name": "Taxpayer first name",
  "page": 1,
  "rect": {
    "x": 0.074,
    "y": 0.115,
    "width": 0.23,
    "height": 0.021
  },
  "type": "text",
  "binding": {
    "pointer": "/taxpayer/name/first",
    "fallback": ""
  }
}
```

Taxpayer data:

```json
{
  "taxpayer": {
    "name": {
      "first": "Mayank"
    }
  }
}
```

Resolution:

```text
{ "taxpayer": { "name": { "first": "Mayank" } } }
        ↓
/taxpayer/name/first
        ↓
"Mayank"
        ↓
drawn inside rect on page 1
```

If the user later edits the data to `"first": "Alex"`, Preview and Export
show **Alex** in that same rectangle. The annotation did not need to change.

## Document (template) model

```json
{
  "schemaVersion": "1.0.0",
  "id": "form-1040-2025-demo",
  "name": "2025 Form 1040 — demo mapping",
  "form": {
    "id": "f1040-2025",
    "title": "U.S. Individual Income Tax Return",
    "taxYear": 2025,
    "source": { "kind": "bundled", "path": "/forms/f1040-2025.pdf" },
    "pageCount": 2
  },
  "fields": [ /* annotation fields */ ],
  "createdAt": "2026-09-23T00:00:00.000Z",
  "updatedAt": "2026-09-23T00:00:00.000Z"
}
```

Uploaded PDFs use:

```json
{ "kind": "upload", "fileName": "form.pdf", "storageKey": "pdf:…" }
```

`storageKey` points at IndexedDB in the browser, not a public URL.

## Coordinate system

`rect` values are **fractions of the page**, origin at the **top-left**:

- `x = 0` left edge, `x = 1` right edge
- `y = 0` top edge, `y = 1` bottom edge
- `width` / `height` are also 0–1

This stays stable across zoom and different render sizes.

PDF user space is different: origin at the **bottom-left**, Y increases up,
units are points. Conversion for a page of size `W × H`:

```text
pdfX      = rect.x × W
pdfY      = H - (rect.y + rect.height) × H
pdfWidth  = rect.width × W
pdfHeight = rect.height × H
```

Preview and export share this conversion so what you see matches the download.

## JSON Pointer (data binding)

Bindings use [RFC 6901 JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901).

Rules:

- Must start with `/`
- Object keys are path segments: `/taxpayer/name/first`
- Array indexes are zero-based: `/income/w2s/0/wages`
- Escape `~` as `~0` and `/` as `~1` inside a key

Examples against:

```json
{
  "taxpayer": { "name": { "first": "Mayank" }, "ssn": "123456789" },
  "income": { "w2s": [{ "wages": 128450.75 }] }
}
```

| Pointer | Value |
|---------|-------|
| `/taxpayer/name/first` | `"Mayank"` |
| `/taxpayer/ssn` | `"123456789"` |
| `/income/w2s/0/wages` | `128450.75` |
| `/income/w2s/99/wages` | unresolved (error) |

Unresolved pointers surface in the inspector and on the canvas. Export uses
`binding.fallback` when the path is missing.

## Formatting

`type` + `format` control how the resolved value is printed.

Currency:

```json
{
  "type": "currency",
  "binding": { "pointer": "/income/w2s/0/wages", "fallback": "0" },
  "format": { "locale": "en-US", "currency": "USD" }
}
```

`128450.75` → `$128,450.75`

SSN:

```json
{
  "type": "ssn",
  "binding": { "pointer": "/taxpayer/ssn", "fallback": "" },
  "format": { "locale": "en-US", "currency": "USD", "dateStyle": "short" }
}
```

`"123456789"` → `123-45-6789`

Other types:

- `number` — locale-aware number
- `date` — `short` / `medium` / `iso`
- `ein` — `XX-XXXXXXX`
- `checkbox` / `radio` — map truthiness to `format.trueValue` / `falseValue`
- `text` — `String(value)`

Overflow: `shrink` reduces font size until the text fits; `clip` truncates.

## Validation

Templates are validated with Zod (`schemaVersion` must be `"1.0.0"`).

- Invalid geometry (values outside 0–1) is rejected
- Unknown schema versions are rejected
- `POST /api/templates/validate` runs the same schema on the server (template
  JSON only — never the PDF or taxpayer data)

## Not built yet

- Repeat groups (dependents, W-2 rows)
- Conditional fields
- Shared templates / comments / audit trail
- OCR field detection
- Writing into native AcroForm widgets

Normalized geometry and JSON Pointer bindings should still apply if those are
added later.
