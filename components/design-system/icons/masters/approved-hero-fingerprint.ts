import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SCE_APPROVED_HERO_ICON_NAMES,
  SCE_APPROVED_HERO_MASTER_ASSETS,
  type SceApprovedHeroIconName,
} from "./approved-hero-meta";

/** Stable geometry fingerprint — style defaults stripped; vector markup preserved. */
export function fingerprintApprovedHeroMasterSvg(relativePath: string): string {
  const raw = readFileSync(join(process.cwd(), relativePath), "utf8");
  const geometry = raw
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(geometry).digest("hex");
}

export const SCE_APPROVED_HERO_GEOMETRY_FINGERPRINTS: Record<SceApprovedHeroIconName, string> =
  Object.fromEntries(
    SCE_APPROVED_HERO_ICON_NAMES.map((name) => [
      name,
      fingerprintApprovedHeroMasterSvg(SCE_APPROVED_HERO_MASTER_ASSETS[name]),
    ]),
  ) as Record<SceApprovedHeroIconName, string>;
