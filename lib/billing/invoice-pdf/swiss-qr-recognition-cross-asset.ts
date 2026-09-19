import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SIX_CROSS_ASSET_FILE = "six-swiss-qr-black-white-cross-7mm.png";

/** Resolved next to this module so Vercel/Next output tracing includes the PNG. */
export function getSwissQrRecognitionCrossAssetAbsolutePath(): string {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "assets",
    SIX_CROSS_ASSET_FILE,
  );
}

export async function loadSwissQrRecognitionCrossAssetBytes(): Promise<Uint8Array> {
  const buf = await readFile(getSwissQrRecognitionCrossAssetAbsolutePath());
  return new Uint8Array(buf);
}

export function loadSwissQrRecognitionCrossAssetBytesSync(): Uint8Array {
  return new Uint8Array(readFileSync(getSwissQrRecognitionCrossAssetAbsolutePath()));
}
