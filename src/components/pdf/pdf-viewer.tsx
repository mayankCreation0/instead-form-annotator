"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Rnd } from "react-rnd";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { resolveFieldValue } from "@/lib/bindings/formatters";
import { clampNormalizedRect } from "@/lib/pdf/coordinates";
import type { AnnotationField } from "@/lib/schema/annotation-schema";
import { useAnnotationStore } from "@/store/annotation-store";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// Checkbox cells on a 1040 are only a few pixels tall at default zoom.
const MIN_DRAW_PX = 4;

type PdfViewerProps = {
  file: string | Blob | ArrayBuffer | null;
  onDocumentLoad: (pages: number) => void;
};

type DraftRect = {
  startX: number;
  startY: number;
  x: number;
  y: number;
};

function FieldBox({
  field,
  pageWidth,
  pageHeight,
}: {
  field: AnnotationField;
  pageWidth: number;
  pageHeight: number;
}) {
  const mode = useAnnotationStore((state) => state.mode);
  const data = useAnnotationStore((state) => state.data);
  const selectedFieldId = useAnnotationStore((state) => state.selectedFieldId);
  const showGrid = useAnnotationStore((state) => state.showGrid);
  const selectField = useAnnotationStore((state) => state.selectField);
  const updateField = useAnnotationStore((state) => state.updateField);
  const result = resolveFieldValue(field, data);
  const isSelected = selectedFieldId === field.id;
  const left = field.rect.x * pageWidth;
  const top = field.rect.y * pageHeight;
  const width = field.rect.width * pageWidth;
  const height = field.rect.height * pageHeight;
  const preview = mode === "preview";
  const snap = (value: number) =>
    showGrid ? Math.round(value / 0.01) * 0.01 : value;

  const content = (
    <>
      {!preview && <span className="field-box-label">{field.name}</span>}
      {preview && (
        <span
          className="field-box-value"
          style={{
            color: field.appearance.color,
            fontFamily:
              field.appearance.fontFamily === "Courier"
                ? "var(--font-mono)"
                : field.appearance.fontFamily === "TimesRoman"
                  ? "Georgia, serif"
                  : "Arial, sans-serif",
            fontSize: field.appearance.fontSize,
            padding: field.appearance.padding,
            textAlign: field.appearance.align,
          }}
        >
          {result.text}
        </span>
      )}
    </>
  );

  if (preview) {
    return (
      <div
        className={`field-box preview ${result.error ? "error" : ""}`}
        title={result.error}
        style={{ left, top, width, height }}
      >
        {content}
      </div>
    );
  }

  return (
    <Rnd
      bounds="parent"
      size={{ width, height }}
      position={{ x: left, y: top }}
      minWidth={10}
      minHeight={10}
      onMouseDown={(event) => {
        event.stopPropagation();
        selectField(field.id);
      }}
      onDragStop={(_, position) => {
        updateField(field.id, {
          rect: clampNormalizedRect({
            ...field.rect,
            x: snap(position.x / pageWidth),
            y: snap(position.y / pageHeight),
          }),
        });
      }}
      onResizeStop={(_, __, element, ___, position) => {
        updateField(field.id, {
          rect: clampNormalizedRect({
            x: snap(position.x / pageWidth),
            y: snap(position.y / pageHeight),
            width: snap(element.offsetWidth / pageWidth),
            height: snap(element.offsetHeight / pageHeight),
          }),
        });
      }}
      className={`field-box ${isSelected ? "selected" : ""} ${result.error ? "error" : ""}`}
      style={{ position: "absolute" }}
      resizeHandleStyles={{
        bottomRight: {
          width: 9,
          height: 9,
          right: -5,
          bottom: -5,
          background: "#202421",
          border: "1px solid white",
        },
      }}
    >
      {content}
    </Rnd>
  );
}

export default function PdfViewer({ file, onDocumentLoad }: PdfViewerProps) {
  const currentPage = useAnnotationStore((state) => state.currentPage);
  const zoom = useAnnotationStore((state) => state.zoom);
  const showGrid = useAnnotationStore((state) => state.showGrid);
  const mode = useAnnotationStore((state) => state.mode);
  const fields = useAnnotationStore((state) => state.template.fields);
  const addField = useAnnotationStore((state) => state.addField);
  const selectField = useAnnotationStore((state) => state.selectField);
  const [aspect, setAspect] = useState(11 / 8.5);
  const [draft, setDraft] = useState<DraftRect | null>(null);
  const [lastSurface, setLastSurface] = useState(`${mode}:${currentPage}`);
  const layerRef = useRef<HTMLDivElement>(null);
  const pageWidth = Math.round(680 * zoom);
  const pageHeight = Math.round(pageWidth * aspect);
  const pageFields = useMemo(
    () => fields.filter((field) => field.page === currentPage && !field.hidden),
    [currentPage, fields],
  );

  const handleDocumentLoad = useCallback(
    (document: PDFDocumentProxy) => {
      onDocumentLoad(document.numPages);
    },
    [onDocumentLoad],
  );

  const handlePageLoad = useCallback((page: PDFPageProxy) => {
    const viewport = page.getViewport({ scale: 1 });
    setAspect(viewport.height / viewport.width);
  }, []);

  const surfaceKey = `${mode}:${currentPage}`;
  if (surfaceKey !== lastSurface) {
    setLastSurface(surfaceKey);
    setDraft(null);
  }

  if (!file) {
    return <div className="empty-canvas">Choose a PDF to begin.</div>;
  }

  return (
    <Document
      file={file}
      onLoadSuccess={handleDocumentLoad}
      loading={<div className="empty-canvas">Rendering PDF…</div>}
      error={
        <div className="empty-canvas">
          This PDF could not be opened. Try a different file.
        </div>
      }
    >
      <div
        className="pdf-page-shell"
        style={{ width: pageWidth, height: pageHeight }}
      >
        <Page
          pageNumber={currentPage}
          width={pageWidth}
          onLoadSuccess={handlePageLoad}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          loading=""
        />
        <div
          ref={layerRef}
          className={`annotation-layer ${showGrid ? "grid-visible" : ""}`}
          aria-label={`Annotation layer for page ${currentPage}`}
          onPointerDown={(event) => {
            if (mode !== "annotate" || event.target !== event.currentTarget) {
              return;
            }
            const bounds = event.currentTarget.getBoundingClientRect();
            const startX = event.clientX - bounds.left;
            const startY = event.clientY - bounds.top;
            selectField(null);
            event.currentTarget.setPointerCapture(event.pointerId);
            setDraft({ startX, startY, x: startX, y: startY });
          }}
          onPointerMove={(event) => {
            if (!draft || !layerRef.current) return;
            const bounds = layerRef.current.getBoundingClientRect();
            setDraft((current) =>
              current
                ? {
                    ...current,
                    x: Math.max(0, Math.min(pageWidth, event.clientX - bounds.left)),
                    y: Math.max(0, Math.min(pageHeight, event.clientY - bounds.top)),
                  }
                : null,
            );
          }}
          onPointerUp={(event) => {
            if (!draft) return;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            const x = Math.min(draft.startX, draft.x);
            const y = Math.min(draft.startY, draft.y);
            const width = Math.abs(draft.x - draft.startX);
            const height = Math.abs(draft.y - draft.startY);
            if (width >= MIN_DRAW_PX && height >= MIN_DRAW_PX) {
              addField(currentPage, {
                x: x / pageWidth,
                y: y / pageHeight,
                width: width / pageWidth,
                height: height / pageHeight,
              });
            }
            setDraft(null);
          }}
          onPointerCancel={() => setDraft(null)}
        >
          {pageFields.map((field) => (
            <FieldBox
              key={field.id}
              field={field}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
            />
          ))}
          {draft && (
            <div
              className="field-box selected"
              style={{
                left: Math.min(draft.startX, draft.x),
                top: Math.min(draft.startY, draft.y),
                width: Math.abs(draft.x - draft.startX),
                height: Math.abs(draft.y - draft.startY),
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      </div>
    </Document>
  );
}
