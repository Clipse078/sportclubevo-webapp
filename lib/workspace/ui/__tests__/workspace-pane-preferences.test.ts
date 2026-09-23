/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  persistWorkspaceInspectorOpen,
  persistWorkspaceNavWidth,
  readStoredWorkspaceInspectorOpen,
  readStoredWorkspaceNavWidth,
  WORKSPACE_NAV_WIDTH_STORAGE_KEY,
} from "@/lib/workspace/ui/workspace-pane-preferences";

describe("workspace pane preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists nav width in localStorage", () => {
    persistWorkspaceNavWidth(260);
    expect(localStorage.getItem(WORKSPACE_NAV_WIDTH_STORAGE_KEY)).toBe("260");
    expect(readStoredWorkspaceNavWidth()).toBe(260);
  });

  it("persists inspector open state", () => {
    persistWorkspaceInspectorOpen(false);
    expect(readStoredWorkspaceInspectorOpen()).toBe(false);
  });
});
