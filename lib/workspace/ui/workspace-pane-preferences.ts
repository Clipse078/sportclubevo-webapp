/** Workspace folder nav + inspector pane sizes — local UI preference only (no server schema). */

export const WORKSPACE_NAV_WIDTH_STORAGE_KEY = "sce-workspace-nav-width";
export const WORKSPACE_INSPECTOR_WIDTH_STORAGE_KEY = "sce-workspace-inspector-width";
export const WORKSPACE_INSPECTOR_OPEN_STORAGE_KEY = "sce-workspace-inspector-open";

export const WORKSPACE_NAV_WIDTH_MIN = 200;
export const WORKSPACE_NAV_WIDTH_MAX = 360;
export const WORKSPACE_NAV_WIDTH_DEFAULT = 240;

export const WORKSPACE_INSPECTOR_WIDTH_MIN = 280;
export const WORKSPACE_INSPECTOR_WIDTH_MAX = 520;
export const WORKSPACE_INSPECTOR_WIDTH_DEFAULT = 360;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampWorkspaceNavWidth(width: number): number {
  return clamp(width, WORKSPACE_NAV_WIDTH_MIN, WORKSPACE_NAV_WIDTH_MAX);
}

export function clampWorkspaceInspectorWidth(width: number): number {
  return clamp(width, WORKSPACE_INSPECTOR_WIDTH_MIN, WORKSPACE_INSPECTOR_WIDTH_MAX);
}

function readStoredWidth(key: string, fallback: number, clampFn: (n: number) => number): number {
  if (typeof window === "undefined") return fallback;
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;
  const parsed = Number.parseInt(stored, 10);
  if (Number.isNaN(parsed)) return fallback;
  return clampFn(parsed);
}

export function readStoredWorkspaceNavWidth(): number {
  return readStoredWidth(
    WORKSPACE_NAV_WIDTH_STORAGE_KEY,
    WORKSPACE_NAV_WIDTH_DEFAULT,
    clampWorkspaceNavWidth,
  );
}

export function persistWorkspaceNavWidth(width: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    WORKSPACE_NAV_WIDTH_STORAGE_KEY,
    String(clampWorkspaceNavWidth(width)),
  );
}

export function readStoredWorkspaceInspectorWidth(): number {
  return readStoredWidth(
    WORKSPACE_INSPECTOR_WIDTH_STORAGE_KEY,
    WORKSPACE_INSPECTOR_WIDTH_DEFAULT,
    clampWorkspaceInspectorWidth,
  );
}

export function persistWorkspaceInspectorWidth(width: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    WORKSPACE_INSPECTOR_WIDTH_STORAGE_KEY,
    String(clampWorkspaceInspectorWidth(width)),
  );
}

export function readStoredWorkspaceInspectorOpen(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(WORKSPACE_INSPECTOR_OPEN_STORAGE_KEY);
  if (stored === "0") return false;
  return true;
}

export function persistWorkspaceInspectorOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WORKSPACE_INSPECTOR_OPEN_STORAGE_KEY, open ? "1" : "0");
}
