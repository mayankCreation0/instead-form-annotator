import {
  PDFDocument,
  StandardFonts,
  cmyk,
  degrees,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type {
  AnnotationField,
  AnnotationTemplate,
} from "@/lib/schema/annotation-schema";
import { resolveFieldValue } from "@/lib/bindings/formatters";
import { normalizedToPdfRect } from "./coordinates";

const fonts: Record<AnnotationField["appearance"]["fontFamily"], StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  TimesRoman: StandardFonts.TimesRoman,
  Courier: StandardFonts.Courier,
};

function hexToCmyk(hex: string) {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const key = 1 - Math.max(red, green, blue);
  if (key >= 1) return cmyk(0, 0, 0, 1);
  return cmyk(
    (1 - red - key) / (1 - key),
    (1 - green - key) / (1 - key),
    (1 - blue - key) / (1 - key),
    key,
  );
}

function fitFontSize(
  text: string,
  font: PDFFont,
  requested: number,
  maxWidth: number,
  min = 4,
): number {
  let size = requested;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.25;
  }
  return size;
}

function drawField(
  page: PDFPage,
  field: AnnotationField,
  text: string,
  font: PDFFont,
): void {
  if (!text || field.hidden) return;
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const rect = normalizedToPdfRect(field.rect, pageWidth, pageHeight);
  const padding = field.appearance.padding;
  const maxWidth = Math.max(1, rect.width - padding * 2);
  const fontSize =
    field.appearance.overflow === "shrink"
      ? fitFontSize(text, font, field.appearance.fontSize, maxWidth)
      : field.appearance.fontSize;
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const x =
    field.appearance.align === "right"
      ? rect.x + rect.width - padding - textWidth
      : field.appearance.align === "center"
        ? rect.x + (rect.width - textWidth) / 2
        : rect.x + padding;
  const y =
    field.appearance.verticalAlign === "top"
      ? rect.y + rect.height - padding - fontSize
      : field.appearance.verticalAlign === "bottom"
        ? rect.y + padding
        : rect.y + (rect.height - fontSize) / 2 + fontSize * 0.16;
  const rotation = page.getRotation().angle;

  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color: hexToCmyk(field.appearance.color),
    maxWidth: field.appearance.overflow === "clip" ? maxWidth : undefined,
    rotate: degrees(rotation === 0 ? 0 : rotation),
  });
}

export async function createFilledPdf(
  source: ArrayBuffer,
  template: AnnotationTemplate,
  data: unknown,
): Promise<Uint8Array> {
  const document = await PDFDocument.load(source);
  const embedded = new Map<StandardFonts, PDFFont>();

  for (const field of template.fields) {
    const page = document.getPage(field.page - 1);
    if (!page) continue;
    const standardFont = fonts[field.appearance.fontFamily];
    let font = embedded.get(standardFont);
    if (!font) {
      font = await document.embedFont(standardFont);
      embedded.set(standardFont, font);
    }
    const { text } = resolveFieldValue(field, data);
    drawField(page, field, text, font);
  }

  document.setTitle(`${template.name} — filled`);
  document.setProducer("Form Studio");
  return document.save();
}

export function downloadBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
