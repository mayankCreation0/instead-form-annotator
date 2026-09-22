export type ResolveResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

function decodeToken(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function resolvePointer(
  document: unknown,
  pointer: string,
): ResolveResult {
  if (pointer === "") return { ok: true, value: document };
  if (!pointer.startsWith("/")) {
    return { ok: false, error: "JSON Pointer must start with /" };
  }

  let current: unknown = document;
  for (const rawToken of pointer.slice(1).split("/")) {
    const token = decodeToken(rawToken);
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(token)) {
        return { ok: false, error: `Expected an array index at “${token}”` };
      }
      const index = Number(token);
      if (index >= current.length) {
        return { ok: false, error: `Array index ${index} is out of range` };
      }
      current = current[index];
      continue;
    }

    if (current !== null && typeof current === "object") {
      const record = current as Record<string, unknown>;
      if (!(token in record)) {
        return { ok: false, error: `Property “${token}” was not found` };
      }
      current = record[token];
      continue;
    }

    return { ok: false, error: `Cannot read “${token}” from a scalar value` };
  }

  return { ok: true, value: current };
}

export type DataLeaf = {
  pointer: string;
  label: string;
  value: unknown;
};

export function listDataLeaves(
  value: unknown,
  pointer = "",
  output: DataLeaf[] = [],
): DataLeaf[] {
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      listDataLeaves(child, `${pointer}/${index}`, output),
    );
    return output;
  }

  if (value !== null && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      const escaped = key.replace(/~/g, "~0").replace(/\//g, "~1");
      listDataLeaves(child, `${pointer}/${escaped}`, output);
    });
    return output;
  }

  output.push({
    pointer: pointer || "",
    label: pointer.split("/").at(-1)?.replace(/~1/g, "/").replace(/~0/g, "~") || "root",
    value,
  });
  return output;
}
