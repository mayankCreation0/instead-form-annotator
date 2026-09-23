import type { AnnotationField } from "@/lib/schema/annotation-schema";

export type PdfRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function normalizedToPdfRect(
  rect: AnnotationField["rect"],
  pageWidth: number,
  pageHeight: number,
): PdfRect {
  return {
    x: rect.x * pageWidth,
    y: pageHeight - (rect.y + rect.height) * pageHeight,
    width: rect.width * pageWidth,
    height: rect.height * pageHeight,
  };
}

export function clampNormalizedRect(
  rect: AnnotationField["rect"],
): AnnotationField["rect"] {
  const width = Math.min(1, Math.max(0.005, rect.width));
  const height = Math.min(1, Math.max(0.005, rect.height));
  return {
    x: Math.min(1 - width, Math.max(0, rect.x)),
    y: Math.min(1 - height, Math.max(0, rect.y)),
    width,
    height,
  };
}
