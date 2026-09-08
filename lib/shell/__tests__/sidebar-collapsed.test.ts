/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  persistSidebarCollapsed,
  readStoredSidebarCollapsed,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
} from "@/lib/shell/sidebar-collapsed";

describe("sidebar collapsed preference", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to expanded", () => {
    expect(readStoredSidebarCollapsed()).toBe(false);
  });

  it("persists collapsed state in localStorage", () => {
    persistSidebarCollapsed(true);
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe("1");
    expect(readStoredSidebarCollapsed()).toBe(true);

    persistSidebarCollapsed(false);
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe("0");
    expect(readStoredSidebarCollapsed()).toBe(false);
  });
});
