"use client";

import dynamic from "next/dynamic";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileJson,
  Grid3X3,
  Minus,
  Plus,
  Redo2,
  RotateCcw,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { listDataLeaves } from "@/lib/bindings/json-pointer";
import { clampNormalizedRect } from "@/lib/pdf/coordinates";
import { createFilledPdf, downloadBytes } from "@/lib/pdf/export-pdf";
import { savePdf, loadPdf } from "@/lib/storage/pdf-storage";
import type {
  AnnotationField,
  FieldType,
} from "@/lib/schema/annotation-schema";
import {
  hydrateWorkspace,
  persistWorkspace,
  useAnnotationStore,
} from "@/store/annotation-store";

const PdfViewer = dynamic(() => import("@/components/pdf/pdf-viewer"), {
  ssr: false,
  loading: () => <div className="empty-canvas">Loading PDF…</div>,
});

type Toast = { id: number; message: string };

function downloadJson(value: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function FieldList() {
  const fields = useAnnotationStore((state) => state.template.fields);
  const selectedFieldId = useAnnotationStore((state) => state.selectedFieldId);
  const currentPage = useAnnotationStore((state) => state.currentPage);
  const selectField = useAnnotationStore((state) => state.selectField);
  const setCurrentPage = useAnnotationStore((state) => state.setCurrentPage);

  return (
    <aside className="panel panel-left" aria-label="Mapped fields">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">Fields</div>
          <h2 className="panel-title">{fields.length} fields</h2>
        </div>
      </div>
      <ul className="field-list">
        {fields.map((field) => (
          <li key={field.id}>
            <button
              type="button"
              className="field-row"
              aria-current={selectedFieldId === field.id}
              onClick={() => {
                if (field.page !== currentPage) setCurrentPage(field.page);
                selectField(field.id);
              }}
            >
              <span className="field-dot" />
              <span>
                <span className="field-row-name">{field.name}</span>
                <span className="field-row-meta">
                  P{field.page} · {field.binding.pointer}
                </span>
              </span>
              <span className="field-badge">{field.type}</span>
            </button>
          </li>
        ))}
      </ul>
      {fields.length === 0 && (
        <div className="empty-inspector">
          <strong>No fields yet</strong>
          Draw a box on the PDF to add one.
        </div>
      )}
    </aside>
  );
}

function Inspector() {
  const template = useAnnotationStore((state) => state.template);
  const selectedFieldId = useAnnotationStore((state) => state.selectedFieldId);
  const data = useAnnotationStore((state) => state.data);
  const updateField = useAnnotationStore((state) => state.updateField);
  const removeField = useAnnotationStore((state) => state.removeField);
  const duplicateField = useAnnotationStore((state) => state.duplicateField);
  const leaves = useMemo(() => listDataLeaves(data), [data]);
  const field = template.fields.find((item) => item.id === selectedFieldId);

  if (!field) {
    return (
      <aside className="panel panel-right" aria-label="Field inspector">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">Inspector</div>
            <h2 className="panel-title">Nothing selected</h2>
          </div>
        </div>
        <div className="empty-inspector">
          <strong>Select or draw a field</strong>
          Click a field in the list, or draw one on the PDF.
        </div>
      </aside>
    );
  }

  const patchAppearance = (
    patch: Partial<AnnotationField["appearance"]>,
  ) => updateField(field.id, { appearance: { ...field.appearance, ...patch } });
  const patchFormat = (patch: Partial<AnnotationField["format"]>) =>
    updateField(field.id, { format: { ...field.format, ...patch } });

  return (
    <aside className="panel panel-right inspector" aria-label="Field inspector">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">Inspector · P{field.page}</div>
          <h2 className="panel-title">{field.name}</h2>
        </div>
        <div className="toolbar-group">
          <button
            className="button icon-button"
            type="button"
            title="Duplicate field"
            onClick={() => duplicateField(field.id)}
          >
            <Copy size={15} />
          </button>
          <button
            className="button icon-button"
            type="button"
            title="Delete field"
            onClick={() => removeField(field.id)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <section className="inspector-section">
        <span className="section-label">Identity & binding</span>
        <div className="form-grid">
          <div className="form-field form-field-full">
            <label htmlFor="field-name">Display name</label>
            <input
              id="field-name"
              className="input"
              value={field.name}
              onChange={(event) =>
                updateField(field.id, { name: event.target.value })
              }
            />
          </div>
          <div className="form-field">
            <label htmlFor="field-type">Field type</label>
            <select
              id="field-type"
              className="select"
              value={field.type}
              onChange={(event) =>
                updateField(field.id, {
                  type: event.target.value as FieldType,
                })
              }
            >
              {[
                "text",
                "currency",
                "number",
                "date",
                "ssn",
                "ein",
                "checkbox",
                "radio",
              ].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="fallback">Fallback</label>
            <input
              id="fallback"
              className="input"
              value={field.binding.fallback}
              onChange={(event) =>
                updateField(field.id, {
                  binding: {
                    ...field.binding,
                    fallback: event.target.value,
                  },
                })
              }
            />
          </div>
          <div className="form-field form-field-full">
            <label htmlFor="binding-pointer">JSON Pointer</label>
            <input
              id="binding-pointer"
              className="input input-mono"
              list="binding-paths"
              value={field.binding.pointer}
              onChange={(event) =>
                updateField(field.id, {
                  binding: { ...field.binding, pointer: event.target.value },
                })
              }
            />
            <datalist id="binding-paths">
              {leaves.map((leaf) => (
                <option key={leaf.pointer} value={leaf.pointer}>
                  {String(leaf.value)}
                </option>
              ))}
            </datalist>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <input
              type="checkbox"
              checked={field.required}
              onChange={(event) =>
                updateField(field.id, { required: event.target.checked })
              }
            />
            Required
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <input
              type="checkbox"
              checked={field.hidden}
              onChange={(event) =>
                updateField(field.id, { hidden: event.target.checked })
              }
            />
            Hidden
          </label>
        </div>
      </section>

      <section className="inspector-section">
        <span className="section-label">Typography</span>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="font-family">Font</label>
            <select
              id="font-family"
              className="select"
              value={field.appearance.fontFamily}
              onChange={(event) =>
                patchAppearance({
                  fontFamily: event.target
                    .value as AnnotationField["appearance"]["fontFamily"],
                })
              }
            >
              <option>Helvetica</option>
              <option>TimesRoman</option>
              <option>Courier</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="font-size">Size (pt)</label>
            <input
              id="font-size"
              className="input input-mono"
              type="number"
              min="4"
              max="72"
              value={field.appearance.fontSize}
              onChange={(event) =>
                patchAppearance({ fontSize: Number(event.target.value) })
              }
            />
          </div>
          <div className="form-field">
            <label htmlFor="align">Alignment</label>
            <select
              id="align"
              className="select"
              value={field.appearance.align}
              onChange={(event) =>
                patchAppearance({
                  align: event.target
                    .value as AnnotationField["appearance"]["align"],
                })
              }
            >
              <option>left</option>
              <option>center</option>
              <option>right</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="overflow">Overflow</label>
            <select
              id="overflow"
              className="select"
              value={field.appearance.overflow}
              onChange={(event) =>
                patchAppearance({
                  overflow: event.target
                    .value as AnnotationField["appearance"]["overflow"],
                })
              }
            >
              <option>shrink</option>
              <option>clip</option>
            </select>
          </div>
        </div>
      </section>

      {field.type === "currency" && (
        <section className="inspector-section">
          <span className="section-label">Currency formatting</span>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="locale">Locale</label>
              <input
                id="locale"
                className="input"
                value={field.format.locale}
                onChange={(event) => patchFormat({ locale: event.target.value })}
              />
            </div>
            <div className="form-field">
              <label htmlFor="currency">Currency</label>
              <input
                id="currency"
                className="input input-mono"
                value={field.format.currency}
                onChange={(event) =>
                  patchFormat({ currency: event.target.value.toUpperCase() })
                }
              />
            </div>
          </div>
        </section>
      )}

      <section className="inspector-section">
        <span className="section-label">Normalized geometry</span>
        <dl className="coordinate-grid">
          {Object.entries(field.rect).map(([key, value]) => (
            <div className="coordinate" key={key}>
              <dt>{key}</dt>
              <dd>{value.toFixed(4)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </aside>
  );
}

function DataWorkspace({ notify }: { notify: (message: string) => void }) {
  const rawData = useAnnotationStore((state) => state.rawData);
  const data = useAnnotationStore((state) => state.data);
  const setRawData = useAnnotationStore((state) => state.setRawData);
  const leaves = useMemo(() => listDataLeaves(data), [data]);
  const [error, setError] = useState<string>();

  return (
    <main id="workspace-main" className="data-mode">
      <section className="data-editor">
        <div className="eyebrow">Data</div>
        <h1 className="editorial-heading">Taxpayer data</h1>
        <p className="supporting-copy">
          JSON used by the field bindings. Edits stay in this browser.
        </p>
        <textarea
          className="textarea"
          aria-label="Taxpayer JSON"
          spellCheck={false}
          value={rawData}
          onChange={(event) => {
            const result = setRawData(event.target.value);
            setError(result.error);
          }}
        />
        <div
          style={{
            marginTop: 10,
            color: error ? "var(--danger)" : "var(--muted)",
            fontSize: 11,
          }}
        >
          {error ?? "Valid JSON"}
        </div>
      </section>
      <section className="data-paths">
        <div className="eyebrow">Pointers</div>
        <h2 className="editorial-heading">Available bindings</h2>
        <p className="supporting-copy">
          Click a path to copy it. Uses JSON Pointer syntax.
        </p>
        <div className="path-list">
          {leaves.map((leaf) => (
            <button
              key={leaf.pointer}
              type="button"
              className="path-row"
              style={{
                width: "100%",
                borderLeft: 0,
                borderRight: 0,
                borderTop: 0,
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
              }}
              onClick={async () => {
                await navigator.clipboard.writeText(leaf.pointer);
                notify(`Copied ${leaf.pointer}`);
              }}
            >
              <span className="path-pointer">{leaf.pointer}</span>
              <span className="path-value">{String(leaf.value)}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function FormStudio() {
  const template = useAnnotationStore((state) => state.template);
  const data = useAnnotationStore((state) => state.data);
  const mode = useAnnotationStore((state) => state.mode);
  const currentPage = useAnnotationStore((state) => state.currentPage);
  const zoom = useAnnotationStore((state) => state.zoom);
  const showGrid = useAnnotationStore((state) => state.showGrid);
  const past = useAnnotationStore((state) => state.past);
  const future = useAnnotationStore((state) => state.future);
  const selectedFieldId = useAnnotationStore((state) => state.selectedFieldId);
  const setMode = useAnnotationStore((state) => state.setMode);
  const setCurrentPage = useAnnotationStore((state) => state.setCurrentPage);
  const setZoom = useAnnotationStore((state) => state.setZoom);
  const toggleGrid = useAnnotationStore((state) => state.toggleGrid);
  const setDocument = useAnnotationStore((state) => state.setDocument);
  const updatePageCount = useAnnotationStore((state) => state.updatePageCount);
  const removeField = useAnnotationStore((state) => state.removeField);
  const duplicateField = useAnnotationStore((state) => state.duplicateField);
  const updateField = useAnnotationStore((state) => state.updateField);
  const importTemplate = useAnnotationStore((state) => state.importTemplate);
  const resetSample = useAnnotationStore((state) => state.resetSample);
  const undo = useAnnotationStore((state) => state.undo);
  const redo = useAnnotationStore((state) => state.redo);
  const [pdfFile, setPdfFile] = useState<string | Blob | null>(
    "/forms/f1040-2025.pdf",
  );
  const [toast, setToast] = useState<Toast>();
  const [exporting, setExporting] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((message: string) => {
    const id = Date.now();
    setToast({ id, message });
    window.setTimeout(
      () => setToast((current) => (current?.id === id ? undefined : current)),
      2600,
    );
  }, []);

  useEffect(() => {
    hydrateWorkspace();
    const stored = useAnnotationStore.getState().template.form.source;
    if (stored.kind === "upload") {
      void loadPdf(stored.storageKey).then((blob) => {
        if (blob) setPdfFile(blob);
        else notify("Uploaded PDF missing - pick it again.");
      });
    }
    const unsubscribe = useAnnotationStore.subscribe(() => persistWorkspace());
    return unsubscribe;
  }, [notify]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if ((event.key === "Backspace" || event.key === "Delete") && selectedFieldId) {
        event.preventDefault();
        removeField(selectedFieldId);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d" && selectedFieldId) {
        event.preventDefault();
        duplicateField(selectedFieldId);
      }
      if (
        selectedFieldId &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        const selected = useAnnotationStore
          .getState()
          .template.fields.find((field) => field.id === selectedFieldId);
        if (!selected) return;
        event.preventDefault();
        const amount = event.shiftKey ? 0.01 : 0.002;
        const dx =
          event.key === "ArrowLeft"
            ? -amount
            : event.key === "ArrowRight"
              ? amount
              : 0;
        const dy =
          event.key === "ArrowUp"
            ? -amount
            : event.key === "ArrowDown"
              ? amount
              : 0;
        updateField(selected.id, {
          rect: clampNormalizedRect({
            ...selected.rect,
            x: selected.rect.x + dx,
            y: selected.rect.y + dy,
          }),
        });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [duplicateField, redo, removeField, selectedFieldId, undo, updateField]);

  const sourceArrayBuffer = useCallback(async (): Promise<ArrayBuffer> => {
    if (pdfFile instanceof Blob) return pdfFile.arrayBuffer();
    const response = await fetch(
      typeof pdfFile === "string" ? pdfFile : template.form.source.kind === "bundled"
        ? template.form.source.path
        : "",
    );
    if (!response.ok) throw new Error("Could not load the source PDF");
    return response.arrayBuffer();
  }, [pdfFile, template.form.source]);

  const handlePdfExport = async () => {
    try {
      setExporting(true);
      const source = await sourceArrayBuffer();
      const output = await createFilledPdf(source, template, data);
      downloadBytes(output, `${template.form.id}-filled.pdf`);
      notify("Downloaded filled PDF");
    } catch (error) {
      notify(error instanceof Error ? error.message : "PDF export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">i</div>
            <div>
              <div className="brand-name">Form Studio</div>
              <div className="brand-subtitle">Instead take-home</div>
            </div>
          </div>
          <nav className="mode-switcher" aria-label="Workspace mode">
            {(["annotate", "preview", "data"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className="mode-button"
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </nav>
          <div className="topbar-actions">
            <span className="status-pill">
              <span className="status-dot" /> Saved locally
            </span>
            <button
              type="button"
              className="button button-ghost-light"
              onClick={() => importRef.current?.click()}
            >
              <FileJson size={15} /> Import
            </button>
            <button
              type="button"
              className="button button-ghost-light"
              onClick={() => downloadJson(template, `${template.form.id}.template.json`)}
            >
              <Download size={15} /> JSON
            </button>
            <button
              type="button"
              className="button button-primary"
              disabled={exporting}
              onClick={handlePdfExport}
            >
              <Download size={15} />
              {exporting ? "Rendering…" : "Export PDF"}
            </button>
          </div>
        </header>

        {mode === "data" ? (
          <DataWorkspace notify={notify} />
        ) : (
          <main id="workspace-main" className="workspace-grid">
            <FieldList />
            <section className="canvas-column" aria-label="PDF workspace">
              <div className="canvas-toolbar">
                <div className="toolbar-group">
                  <span
                    className="eyebrow"
                    title={template.form.title}
                    style={{ color: "var(--ink)", marginRight: 8 }}
                  >
                    {template.name}
                  </span>
                  <span className="toolbar-separator" />
                  <button
                    type="button"
                    className="button icon-button"
                    title="Undo"
                    disabled={past.length === 0}
                    onClick={undo}
                  >
                    <Undo2 size={15} />
                  </button>
                  <button
                    type="button"
                    className="button icon-button"
                    title="Redo"
                    disabled={future.length === 0}
                    onClick={redo}
                  >
                    <Redo2 size={15} />
                  </button>
                  <span className="toolbar-separator" />
                  <button
                    type="button"
                    className="button"
                    aria-pressed={showGrid}
                    onClick={toggleGrid}
                  >
                    <Grid3X3 size={15} /> Grid
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => uploadRef.current?.click()}
                  >
                    <Upload size={15} /> Replace PDF
                  </button>
                  <button
                    type="button"
                    className="button"
                    title="Restore the sample project"
                    onClick={() => {
                      resetSample();
                      setPdfFile("/forms/f1040-2025.pdf");
                      notify("Reset to sample");
                    }}
                  >
                    <RotateCcw size={15} /> Reset
                  </button>
                </div>
                <div className="toolbar-group">
                  <button
                    type="button"
                    className="button icon-button"
                    title="Zoom out"
                    onClick={() => setZoom(zoom - 0.1)}
                  >
                    <Minus size={15} />
                  </button>
                  <span className="zoom-label">{Math.round(zoom * 100)}%</span>
                  <button
                    type="button"
                    className="button icon-button"
                    title="Zoom in"
                    onClick={() => setZoom(zoom + 0.1)}
                  >
                    <Plus size={15} />
                  </button>
                  <span className="toolbar-separator" />
                  <button
                    type="button"
                    className="button icon-button"
                    title="Previous page"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="zoom-label">
                    {currentPage} / {template.form.pageCount}
                  </span>
                  <button
                    type="button"
                    className="button icon-button"
                    title="Next page"
                    disabled={currentPage >= template.form.pageCount}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
              <div className="pdf-scroll">
                <PdfViewer
                  file={pdfFile}
                  onDocumentLoad={(pageCount) => updatePageCount(pageCount)}
                />
              </div>
            </section>
            <Inspector />
          </main>
        )}
      </div>

      <section className="mobile-notice">
        <div className="mobile-notice-inner">
          <div className="eyebrow">Desktop only</div>
          <h1 className="editorial-heading">Needs a wider screen</h1>
          <p className="supporting-copy">
            Open this on a display at least 780px wide. The PDF canvas and
            side panels do not fit well on phones.
          </p>
        </div>
      </section>

      <input
        ref={uploadRef}
        hidden
        type="file"
        accept="application/pdf,.pdf"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (file.type !== "application/pdf" || file.size > 25 * 1024 * 1024) {
            notify("Choose a PDF smaller than 25 MB");
            return;
          }
          const storageKey = await savePdf(file);
          setPdfFile(file);
          setDocument({
            id: file.name.replace(/\.pdf$/i, "").toLowerCase().replace(/\W+/g, "-"),
            title: file.name.replace(/\.pdf$/i, ""),
            taxYear: new Date().getFullYear(),
            source: { kind: "upload", fileName: file.name, storageKey },
            pageCount: 1,
          });
          notify("PDF loaded.");
          event.target.value = "";
        }}
      />
      <input
        ref={importRef}
        hidden
        type="file"
        accept="application/json,.json"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            const value = JSON.parse(await file.text());
            const result = importTemplate(value);
            if (!result.ok) throw new Error(result.error);
            if (value.form.source.kind === "bundled") {
              setPdfFile(value.form.source.path);
            } else {
              const blob = await loadPdf(value.form.source.storageKey);
              if (blob) setPdfFile(blob);
            }
            notify("Template imported");
          } catch (error) {
            notify(error instanceof Error ? error.message : "Invalid template");
          }
          event.target.value = "";
        }}
      />
      {toast && <div className="toast" role="status">{toast.message}</div>}
    </>
  );
}
