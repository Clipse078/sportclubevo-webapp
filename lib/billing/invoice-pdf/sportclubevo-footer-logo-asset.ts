import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SPORTCLUBEVO_FOOTER_LOGO_ASSET_FILE = "sportclubevo-footer-logo.png";

/** Resolved next to this module so Vercel/Next output tracing includes the PNG. */
export function getSportClubEvoFooterLogoAssetAbsolutePath(): string {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "assets",
    SPORTCLUBEVO_FOOTER_LOGO_ASSET_FILE,
  );
}

export async function loadSportClubEvoFooterLogoAssetBytes(): Promise<Uint8Array> {
  const buf = await readFile(getSportClubEvoFooterLogoAssetAbsolutePath());
  return new Uint8Array(buf);
}

export function loadSportClubEvoFooterLogoAssetBytesSync(): Uint8Array {
  return new Uint8Array(readFileSync(getSportClubEvoFooterLogoAssetAbsolutePath()));
}
