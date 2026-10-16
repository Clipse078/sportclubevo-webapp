import {
  buildProgrammeHref,
  parseProgrammeUrlState,
  type ProgrammeUrlState,
} from "@/lib/programme-engine/programme-url";
import type { PersonalKalenderSourceFilter } from "./kalender-url";

export const MEIN_PROGRAMM_BASE_PATH = "/dashboard/mein-programm";

export type MeinProgrammUrlState = ProgrammeUrlState & {
  /** Calendar-layer source filter (programme vs tasks); meaningful in Kalender view. */
  quelle: PersonalKalenderSourceFilter;
};

export function parseMeinProgrammUrlState(
  params: Record<string, string | string[] | undefined>,
): MeinProgrammUrlState {
  const programme = parseProgrammeUrlState(params);
  const quelleRaw = params.quelle;
  let quelle: PersonalKalenderSourceFilter = "alle";
  if (quelleRaw === "termine" || quelleRaw === "aufgaben") {
    quelle = quelleRaw;
  }
  return { ...programme, quelle };
}

export function buildMeinProgrammHref(
  current: MeinProgrammUrlState,
  patch: Partial<MeinProgrammUrlState>,
): string {
  const next: MeinProgrammUrlState = { ...current, ...patch };
  let href = buildProgrammeHref(MEIN_PROGRAMM_BASE_PATH, current, patch);
  if (next.quelle !== "alle") {
    const sep = href.includes("?") ? "&" : "?";
    href = `${href}${sep}quelle=${encodeURIComponent(next.quelle)}`;
  }
  return href;
}

/** Legacy personal-programme calendar URL → canonical Mein Programm Kalender. */
export function buildLegacyTermineKalenderRedirectTarget(
  month: string,
  extraParams?: Record<string, string>,
): string {
  const params = new URLSearchParams();
  params.set("ansicht", "kalender");
  if (month) params.set("monat", month);
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${MEIN_PROGRAMM_BASE_PATH}?${qs}` : MEIN_PROGRAMM_BASE_PATH;
}
