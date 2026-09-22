import { z } from "zod";

export const rectSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
});

export const fieldTypeSchema = z.enum([
  "text",
  "currency",
  "number",
  "date",
  "ssn",
  "ein",
  "checkbox",
  "radio",
]);

export const annotationFieldSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  page: z.number().int().min(1),
  rect: rectSchema,
  type: fieldTypeSchema,
  binding: z.object({
    pointer: z.string().startsWith("/"),
    fallback: z.string().default(""),
  }),
  format: z.object({
    locale: z.string().default("en-US"),
    currency: z.string().default("USD"),
    dateStyle: z.enum(["short", "medium", "iso"]).default("short"),
    trueValue: z.string().default("X"),
    falseValue: z.string().default(""),
  }),
  appearance: z.object({
    fontFamily: z.enum(["Helvetica", "TimesRoman", "Courier"]).default("Helvetica"),
    fontSize: z.number().min(4).max(72).default(10),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#111111"),
    align: z.enum(["left", "center", "right"]).default("left"),
    verticalAlign: z.enum(["top", "middle", "bottom"]).default("middle"),
    overflow: z.enum(["shrink", "clip"]).default("shrink"),
    padding: z.number().min(0).max(20).default(2),
  }),
  required: z.boolean().default(false),
  hidden: z.boolean().default(false),
});

export const annotationTemplateSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  id: z.string().min(1),
  name: z.string().min(1),
  form: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    taxYear: z.number().int().min(1900),
    source: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("bundled"), path: z.string().startsWith("/") }),
      z.object({
        kind: z.literal("upload"),
        fileName: z.string().min(1),
        storageKey: z.string().min(1),
      }),
    ]),
    pageCount: z.number().int().positive(),
  }),
  fields: z.array(annotationFieldSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AnnotationField = z.infer<typeof annotationFieldSchema>;
export type AnnotationTemplate = z.infer<typeof annotationTemplateSchema>;
export type FieldType = z.infer<typeof fieldTypeSchema>;

export const DEFAULT_FORMAT: AnnotationField["format"] = {
  locale: "en-US",
  currency: "USD",
  dateStyle: "short",
  trueValue: "X",
  falseValue: "",
};

export const DEFAULT_APPEARANCE: AnnotationField["appearance"] = {
  fontFamily: "Helvetica",
  fontSize: 10,
  color: "#111111",
  align: "left",
  verticalAlign: "middle",
  overflow: "shrink",
  padding: 2,
};
