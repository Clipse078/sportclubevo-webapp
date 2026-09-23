/** Local Workspace list view preferences (no server schema). */

export const WORKSPACE_LIST_DENSITY_STORAGE_KEY = "sce-workspace-list-density";
export const WORKSPACE_LIST_COLUMNS_STORAGE_KEY = "sce-workspace-list-columns";

export type WorkspaceListDensity = "comfortable" | "compact";

export type WorkspaceListColumnId = "modified" | "size" | "version" | "uploadedBy";

export type WorkspaceListColumnPrefs = Record<WorkspaceListColumnId, boolean>;

export const WORKSPACE_LIST_COLUMN_DEFAULTS: WorkspaceListColumnPrefs = {
  modified: true,
  size: true,
  version: true,
  uploadedBy: false,
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function readStoredWorkspaceListDensity(): WorkspaceListDensity {
  const stored = readJson<string | null>(WORKSPACE_LIST_DENSITY_STORAGE_KEY, null);
  return stored === "compact" ? "compact" : "comfortable";
}

export function persistWorkspaceListDensity(density: WorkspaceListDensity): void {
  writeJson(WORKSPACE_LIST_DENSITY_STORAGE_KEY, density);
}

export function readStoredWorkspaceListColumns(): WorkspaceListColumnPrefs {
  const stored = readJson<Partial<WorkspaceListColumnPrefs> | null>(
    WORKSPACE_LIST_COLUMNS_STORAGE_KEY,
    null,
  );
  if (!stored) return { ...WORKSPACE_LIST_COLUMN_DEFAULTS };
  return { ...WORKSPACE_LIST_COLUMN_DEFAULTS, ...stored };
}

export function persistWorkspaceListColumns(columns: WorkspaceListColumnPrefs): void {
  writeJson(WORKSPACE_LIST_COLUMNS_STORAGE_KEY, columns);
}
