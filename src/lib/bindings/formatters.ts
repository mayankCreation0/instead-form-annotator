import type { AnnotationField } from "@/lib/schema/annotation-schema";
import { resolvePointer } from "./json-pointer";

export function formatFieldValue(
  field: AnnotationField,
  value: unknown,
): string {
  if (value === null || value === undefined || value === "") {
    return field.binding.fallback;
  }

  switch (field.type) {
    case "currency": {
      const amount = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(amount)) return field.binding.fallback;
      return new Intl.NumberFormat(field.format.locale, {
        style: "currency",
        currency: field.format.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    }
    case "number": {
      const amount = typeof value === "number" ? value : Number(value);
      return Number.isFinite(amount)
        ? new Intl.NumberFormat(field.format.locale).format(amount)
        : field.binding.fallback;
    }
    case "date": {
      const date = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(date.getTime())) return field.binding.fallback;
      if (field.format.dateStyle === "iso") {
        return date.toISOString().slice(0, 10);
      }
      return new Intl.DateTimeFormat(field.format.locale, {
        dateStyle: field.format.dateStyle,
        timeZone: "UTC",
      }).format(date);
    }
    case "ssn": {
      const digits = String(value).replace(/\D/g, "").slice(0, 9);
      return digits.length === 9
        ? `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
        : String(value);
    }
    case "ein": {
      const digits = String(value).replace(/\D/g, "").slice(0, 9);
      return digits.length === 9
        ? `${digits.slice(0, 2)}-${digits.slice(2)}`
        : String(value);
    }
    case "checkbox":
    case "radio":
      return Boolean(value) ? field.format.trueValue : field.format.falseValue;
    default:
      return String(value);
  }
}

export function resolveFieldValue(
  field: AnnotationField,
  data: unknown,
): { text: string; error?: string } {
  const result = resolvePointer(data, field.binding.pointer);
  if (!result.ok) {
    return { text: field.binding.fallback, error: result.error };
  }
  return { text: formatFieldValue(field, result.value) };
}
