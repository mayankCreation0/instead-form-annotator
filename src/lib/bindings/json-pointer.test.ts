import { describe, expect, it } from "vitest";
import { listDataLeaves, resolvePointer } from "./json-pointer";

describe("resolvePointer", () => {
  const data = {
    taxpayer: { name: "Mayank", "a/b": "escaped" },
    wages: [{ amount: 120000 }],
    "til~de": true,
  };

  it("resolves nested object and array values", () => {
    expect(resolvePointer(data, "/wages/0/amount")).toEqual({
      ok: true,
      value: 120000,
    });
  });

  it("supports RFC 6901 escaping", () => {
    expect(resolvePointer(data, "/taxpayer/a~1b")).toEqual({
      ok: true,
      value: "escaped",
    });
    expect(resolvePointer(data, "/til~0de")).toEqual({ ok: true, value: true });
  });

  it("errors when a property is missing", () => {
    expect(resolvePointer(data, "/taxpayer/ssn")).toEqual({
      ok: false,
      error: 'Property "ssn" was not found',
    });
  });
});

describe("listDataLeaves", () => {
  it("emits escaped pointers for every scalar leaf", () => {
    expect(listDataLeaves({ rows: [{ "gross/pay": 42 }] })).toEqual([
      { pointer: "/rows/0/gross~1pay", label: "gross/pay", value: 42 },
    ]);
  });
});
