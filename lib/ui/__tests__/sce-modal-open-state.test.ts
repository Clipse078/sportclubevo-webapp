/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach } from "vitest";
import {
  acquireSceModalOpenState,
  getSceModalOpenCount,
  isSceModalOpen,
  resetSceModalOpenStateForTests,
  SCE_MODAL_OPEN_ATTR,
} from "@/lib/ui/sce-modal-open-state";

describe("sce-modal-open-state SCE-RESPONSIVE-01O", () => {
  afterEach(() => {
    resetSceModalOpenStateForTests();
  });

  it("sets html marker on first acquire and clears on final release", () => {
    expect(document.documentElement.hasAttribute(SCE_MODAL_OPEN_ATTR)).toBe(false);
    const releaseA = acquireSceModalOpenState();
    expect(document.documentElement.getAttribute(SCE_MODAL_OPEN_ATTR)).toBe("1");
    expect(getSceModalOpenCount()).toBe(1);

    releaseA();
    expect(document.documentElement.hasAttribute(SCE_MODAL_OPEN_ATTR)).toBe(false);
    expect(isSceModalOpen()).toBe(false);
  });

  it("reference-counts nested overlays", () => {
    const releaseA = acquireSceModalOpenState();
    const releaseB = acquireSceModalOpenState();
    expect(getSceModalOpenCount()).toBe(2);
    expect(document.documentElement.getAttribute(SCE_MODAL_OPEN_ATTR)).toBe("1");

    releaseB();
    expect(getSceModalOpenCount()).toBe(1);
    expect(document.documentElement.getAttribute(SCE_MODAL_OPEN_ATTR)).toBe("1");

    releaseA();
    expect(getSceModalOpenCount()).toBe(0);
    expect(document.documentElement.hasAttribute(SCE_MODAL_OPEN_ATTR)).toBe(false);
  });
});
