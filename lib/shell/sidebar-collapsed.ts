/** Desktop sidebar collapsed preference — persisted in localStorage only. */

export const SIDEBAR_COLLAPSED_STORAGE_KEY = "sce-sidebar-collapsed";

export function readStoredSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
}

export function persistSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
}
