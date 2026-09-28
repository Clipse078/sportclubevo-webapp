/** SCE-COMM-INBOX-02 — personal Kommunikationscenter workspace layout preferences. */

export const INBOX_WORKSPACE_LAYOUTS = [
  "STANDARD",
  "READING_LARGE",
  "LIST_LARGE",
  "BOTTOM",
  "FULL_READING",
  "LIST_ONLY",
] as const;

export type InboxWorkspaceLayout = (typeof INBOX_WORKSPACE_LAYOUTS)[number];

export const INBOX_WORKSPACE_DENSITIES = ["COMPACT", "STANDARD", "SPACIOUS"] as const;

export type InboxWorkspaceDensity = (typeof INBOX_WORKSPACE_DENSITIES)[number];

export const INBOX_WORKSPACE_LAYOUT_LABELS: Record<InboxWorkspaceLayout, string> = {
  STANDARD: "Standard",
  READING_LARGE: "Lesebereich gross",
  LIST_LARGE: "Liste gross",
  BOTTOM: "Lesebereich unten",
  FULL_READING: "Vollbild lesen",
  LIST_ONLY: "Nur Liste",
};

export const INBOX_WORKSPACE_DENSITY_LABELS: Record<InboxWorkspaceDensity, string> = {
  COMPACT: "Kompakt",
  STANDARD: "Standard",
  SPACIOUS: "Grosszügig",
};

export const INBOX_WORKSPACE_DEFAULT_LAYOUT: InboxWorkspaceLayout = "STANDARD";
export const INBOX_WORKSPACE_DEFAULT_DENSITY: InboxWorkspaceDensity = "STANDARD";
export const INBOX_WORKSPACE_DEFAULT_LIST_SPLIT_PERCENT = 38;

export const INBOX_LIST_PANE_MIN_PX = 280;
export const INBOX_READING_PANE_MIN_PX = 420;
export const INBOX_SPLIT_HANDLE_PX = 8;
export const INBOX_LIST_SPLIT_PERCENT_MIN = 20;
export const INBOX_LIST_SPLIT_PERCENT_MAX = 80;

/** Optional optimistic render cache — server preference remains authoritative. */
export const INBOX_WORKSPACE_PREF_LOCAL_CACHE_KEY = "sce-comm-inbox-workspace-pref-v1";

export type InboxWorkspacePreferenceSnapshot = {
  layout: InboxWorkspaceLayout;
  density: InboxWorkspaceDensity;
  listSplitPercent: number;
  hasStoredPreference: boolean;
};

export function isInboxWorkspaceLayout(value: unknown): value is InboxWorkspaceLayout {
  return (
    typeof value === "string" &&
    (INBOX_WORKSPACE_LAYOUTS as readonly string[]).includes(value)
  );
}

export function isInboxWorkspaceDensity(value: unknown): value is InboxWorkspaceDensity {
  return (
    typeof value === "string" &&
    (INBOX_WORKSPACE_DENSITIES as readonly string[]).includes(value)
  );
}

export function defaultListSplitPercentForLayout(layout: InboxWorkspaceLayout): number {
  switch (layout) {
    case "STANDARD":
      return 38;
    case "READING_LARGE":
      return 28;
    case "LIST_LARGE":
      return 50;
    case "BOTTOM":
      return 42;
    default:
      return INBOX_WORKSPACE_DEFAULT_LIST_SPLIT_PERCENT;
  }
}

export function inboxLayoutUsesVerticalSplit(layout: InboxWorkspaceLayout): boolean {
  return layout === "STANDARD" || layout === "READING_LARGE" || layout === "LIST_LARGE";
}

export function inboxLayoutUsesHorizontalSplit(layout: InboxWorkspaceLayout): boolean {
  return layout === "BOTTOM";
}

export function inboxLayoutIsMasterDetailOnDesktop(layout: InboxWorkspaceLayout): boolean {
  return layout === "FULL_READING" || layout === "LIST_ONLY";
}

export function clampListSplitPercent(percent: number): number {
  return Math.min(
    INBOX_LIST_SPLIT_PERCENT_MAX,
    Math.max(INBOX_LIST_SPLIT_PERCENT_MIN, Math.round(percent)),
  );
}

export function computeListSplitPercentBounds(containerPrimaryPx: number): {
  minPercent: number;
  maxPercent: number;
} {
  if (containerPrimaryPx <= 0) {
    return {
      minPercent: INBOX_LIST_SPLIT_PERCENT_MIN,
      maxPercent: INBOX_LIST_SPLIT_PERCENT_MAX,
    };
  }
  const minPercent = Math.ceil(
    ((INBOX_LIST_PANE_MIN_PX + INBOX_SPLIT_HANDLE_PX / 2) / containerPrimaryPx) * 100,
  );
  const maxPercent = Math.floor(
    ((containerPrimaryPx - INBOX_READING_PANE_MIN_PX - INBOX_SPLIT_HANDLE_PX / 2) /
      containerPrimaryPx) *
      100,
  );
  return {
    minPercent: clampListSplitPercent(Math.max(INBOX_LIST_SPLIT_PERCENT_MIN, minPercent)),
    maxPercent: clampListSplitPercent(Math.min(INBOX_LIST_SPLIT_PERCENT_MAX, maxPercent)),
  };
}

export function canRenderSideBySideSplit(
  containerWidthPx: number,
  listSplitPercent: number,
): boolean {
  if (containerWidthPx <= 0) return false;
  const listPx = (containerWidthPx * listSplitPercent) / 100;
  const readingPx = containerWidthPx - listPx - INBOX_SPLIT_HANDLE_PX;
  return listPx >= INBOX_LIST_PANE_MIN_PX && readingPx >= INBOX_READING_PANE_MIN_PX;
}

export function resolveEffectiveListSplitPercent(
  layout: InboxWorkspaceLayout,
  listSplitPercent: number,
  containerPrimaryPx: number,
): number {
  const bounded = clampListSplitPercent(listSplitPercent);
  const { minPercent, maxPercent } = computeListSplitPercentBounds(containerPrimaryPx);
  if (maxPercent < minPercent) {
    return defaultListSplitPercentForLayout(layout);
  }
  return clampListSplitPercent(Math.min(maxPercent, Math.max(minPercent, bounded)));
}

export function defaultInboxWorkspacePreference(): InboxWorkspacePreferenceSnapshot {
  return {
    layout: INBOX_WORKSPACE_DEFAULT_LAYOUT,
    density: INBOX_WORKSPACE_DEFAULT_DENSITY,
    listSplitPercent: INBOX_WORKSPACE_DEFAULT_LIST_SPLIT_PERCENT,
    hasStoredPreference: false,
  };
}

export function readInboxWorkspacePrefCache(): InboxWorkspacePreferenceSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(INBOX_WORKSPACE_PREF_LOCAL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InboxWorkspacePreferenceSnapshot>;
    if (!isInboxWorkspaceLayout(parsed.layout) || !isInboxWorkspaceDensity(parsed.density)) {
      return null;
    }
    return {
      layout: parsed.layout,
      density: parsed.density,
      listSplitPercent: clampListSplitPercent(
        typeof parsed.listSplitPercent === "number"
          ? parsed.listSplitPercent
          : defaultListSplitPercentForLayout(parsed.layout),
      ),
      hasStoredPreference: true,
    };
  } catch {
    return null;
  }
}

export function writeInboxWorkspacePrefCache(snapshot: InboxWorkspacePreferenceSnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    INBOX_WORKSPACE_PREF_LOCAL_CACHE_KEY,
    JSON.stringify({
      layout: snapshot.layout,
      density: snapshot.density,
      listSplitPercent: snapshot.listSplitPercent,
    }),
  );
}

export function clearInboxWorkspacePrefCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(INBOX_WORKSPACE_PREF_LOCAL_CACHE_KEY);
}
