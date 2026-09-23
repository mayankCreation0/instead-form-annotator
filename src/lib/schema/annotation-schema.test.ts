import { describe, expect, it } from "vitest";
import fixture from "@/data/form-1040-template.json";
import { annotationTemplateSchema } from "./annotation-schema";

describe("annotation template schema", () => {
  it("accepts the bundled Form 1040 fixture", () => {
    const result = annotationTemplateSchema.safeParse(fixture);
    expect(result.success).toBe(true);
  });

  it("rejects unsupported versions", () => {
    const result = annotationTemplateSchema.safeParse({
      ...fixture,
      schemaVersion: "2.0.0",
    });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range geometry", () => {
    const result = annotationTemplateSchema.safeParse({
      ...fixture,
      fields: [
        {
          ...fixture.fields[0],
          rect: { x: 120, y: 80, width: 200, height: 20 },
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
