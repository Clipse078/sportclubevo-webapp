import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SPORTCLUBEVO_HEADER_LOGO_ASSET_FILE = "sportclubevo-header-logo-alt.png";

/** Resolved next to this module so Vercel/Next output tracing includes the PNG. */
export function getSportClubEvoHeaderLogoAssetAbsolutePath(): string {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "assets",
    SPORTCLUBEVO_HEADER_LOGO_ASSET_FILE,
  );
}

export async function loadSportClubEvoHeaderLogoAssetBytes(): Promise<Uint8Array> {
  const buf = await readFile(getSportClubEvoHeaderLogoAssetAbsolutePath());
  return new Uint8Array(buf);
}

export function loadSportClubEvoHeaderLogoAssetBytesSync(): Uint8Array {
  return new Uint8Array(readFileSync(getSportClubEvoHeaderLogoAssetAbsolutePath()));
}
