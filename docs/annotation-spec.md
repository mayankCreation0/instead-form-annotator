# Form Studio annotation specification

Version `1.0.0`

This specification separates a reusable form template from a taxpayer data
instance. A template describes where values go and how they are rendered. It
does not contain a PDF or require taxpayer data to have a fixed shape.

## Document model

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
  "fields": []
}
```

Uploaded PDFs use `{ "kind": "upload", "fileName": "...", "storageKey": "..." }`.
The storage key identifies a browser-local IndexedDB object and is not a public
URL. A template imported on another device asks the user to relink that PDF.

## Field model

Each field has:

- A stable `id`, human-readable `name`, and one-based `page`.
- A normalized `rect` whose `x`, `y`, `width`, and `height` are fractions of
  page dimensions in the range 0–1. The origin is the top-left.
- A semantic `type`: text, number, currency, date, SSN, EIN, checkbox, or
  radio.
- A `binding.pointer` using [RFC 6901 JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901).
- Formatting and appearance rules that are shared by browser preview and PDF
  export.

Example:

```json
{
  "id": "wages",
  "name": "Wages, salaries, tips",
  "page": 1,
  "rect": { "x": 0.797, "y": 0.668, "width": 0.136, "height": 0.019 },
  "type": "currency",
  "binding": {
    "pointer": "/income/w2s/0/wages",
    "fallback": "0"
  }
}
```

JSON Pointer tokens escape `~` as `~0` and `/` as `~1`. Array indexes are
zero-based. Missing bindings are visible as errors in annotation mode and use
the configured fallback during export.

## Coordinate conversion

The browser uses a top-left origin with the Y axis increasing downwards. PDF
user space uses points, a bottom-left origin, and the Y axis increasing
upwards. Given page dimensions `W × H`:

```text
pdfX = rect.x × W
pdfY = H - (rect.y + rect.height) × H
pdfWidth = rect.width × W
pdfHeight = rect.height × H
```

This conversion keeps fields aligned when the viewer zoom changes and across
US Letter or custom page sizes. Rotation is read from each PDF page at export.

## Formatting

- `currency` and `number` use the field locale.
- `date` supports short, medium, and ISO output.
- `ssn` and `ein` normalize digit-only source values.
- `checkbox` and `radio` map truthiness to configurable true/false glyphs.
- Overflow is either `shrink`, which reduces the font until it fits, or `clip`.

Standard PDF fonts are used so exports require no external font files.

## Validation and compatibility

Imports are parsed with the same Zod schema used by the typed application and
the `/api/templates/validate` route. Unknown schema versions are rejected
rather than silently misinterpreted. A future migration registry can transform
older known versions before validation.

## Intentionally deferred

- Repeat groups for dependents, W-2s, and schedule rows.
- Conditional fields based on filing status or entity type.
- Shared template storage, roles, comments, and audit history.
- Optical field detection and suggested bindings.
- Cryptographic signatures and native AcroForm writing.

These can extend the template without changing normalized geometry or JSON
Pointer semantics.
