import { createHash } from "node:crypto";

/** Maximum camt.054 upload size (5 MiB). */
export const CAMT054_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function sha256Camt054Content(xml: string): string {
  return createHash("sha256").update(xml, "utf8").digest("hex");
}

export function assertCamt054UploadWithinLimit(byteLength: number): void {
  if (!Number.isFinite(byteLength) || byteLength <= 0) {
    throw new Error("Leere Datei.");
  }
  if (byteLength > CAMT054_MAX_UPLOAD_BYTES) {
    throw new Error("Die camt.054 Datei ist zu gross.");
  }
}

export function assertCamt054Filename(filename: string): void {
  const trimmed = filename.trim();
  if (!trimmed) {
    throw new Error("Dateiname fehlt.");
  }
  if (!trimmed.toLowerCase().endsWith(".xml")) {
    throw new Error("Nur .xml Dateien sind erlaubt.");
  }
}
