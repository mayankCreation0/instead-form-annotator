import { del, get, set } from "idb-keyval";

const PREFIX = "form-studio:pdf:";

export async function savePdf(file: File): Promise<string> {
  const key = `${PREFIX}${crypto.randomUUID()}`;
  await set(key, file);
  return key;
}

export async function loadPdf(key: string): Promise<Blob | undefined> {
  return get<Blob>(key);
}

export async function removePdf(key: string): Promise<void> {
  await del(key);
}
