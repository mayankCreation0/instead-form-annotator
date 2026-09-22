import { describe, expect, it } from "vitest";
import { clampNormalizedRect, normalizedToPdfRect } from "./coordinates";

describe("PDF coordinate conversion", () => {
  it("flips the Y axis and scales normalized units", () => {
    expect(
      normalizedToPdfRect(
        { x: 0.1, y: 0.2, width: 0.3, height: 0.1 },
        612,
        792,
      ),
    ).toEqual({
      x: 61.2,
      y: 554.4,
      width: 183.6,
      height: 79.2,
    });
  });

  it("clamps rectangles within page bounds", () => {
    expect(
      clampNormalizedRect({
        x: 0.98,
        y: -0.2,
        width: 0.1,
        height: 0.2,
      }),
    ).toEqual({ x: 0.9, y: 0, width: 0.1, height: 0.2 });
  });
});
