import { describe, expect, it } from "vitest";
import template from "@/data/form-1040-template.json";
import data from "@/data/sample-return.json";
import { annotationTemplateSchema } from "@/lib/schema/annotation-schema";
import { formatFieldValue, resolveFieldValue } from "./formatters";

const parsed = annotationTemplateSchema.parse(template);

describe("field formatting", () => {
  it("formats a deeply nested currency binding", () => {
    const field = parsed.fields.find((item) => item.id === "wages")!;
    expect(resolveFieldValue(field, data).text).toBe("$128,450.75");
  });

  it("formats SSN values", () => {
    const field = parsed.fields.find((item) => item.id === "taxpayer-ssn")!;
    expect(formatFieldValue(field, "123456789")).toBe("123-45-6789");
  });

  it("uses fallback and surfaces resolution errors", () => {
    const field = parsed.fields[0];
    const result = resolveFieldValue(field, {});
    expect(result.text).toBe("");
    expect(result.error).toContain("taxpayer");
  });
});
