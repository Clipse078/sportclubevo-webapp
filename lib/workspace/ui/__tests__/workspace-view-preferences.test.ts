/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  persistWorkspaceListDensity,
  readStoredWorkspaceListColumns,
  readStoredWorkspaceListDensity,
} from "@/lib/workspace/ui/workspace-view-preferences";

describe("workspace view preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists list density", () => {
    persistWorkspaceListDensity("compact");
    expect(readStoredWorkspaceListDensity()).toBe("compact");
  });

  it("defaults columns with uploadedBy off", () => {
    expect(readStoredWorkspaceListColumns().uploadedBy).toBe(false);
  });
});
