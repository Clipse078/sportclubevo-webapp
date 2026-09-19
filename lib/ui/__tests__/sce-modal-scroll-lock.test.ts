/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  captureSceDocumentScrollSnapshot,
  lockSceDocumentScroll,
} from "@/lib/ui/sce-modal-scroll-lock";

describe("sce-modal-scroll-lock SCE-RESPONSIVE-01P", () => {
  const scrollToSpy = vi.fn();

  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(scrollToSpy);
    Object.defineProperty(window, "scrollX", { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 840, writable: true, configurable: true });
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not mutate overflow or scroll position (pure overlay model)", () => {
    const snapshot = captureSceDocumentScrollSnapshot();
    const unlock = lockSceDocumentScroll();

    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.style.overflow).toBe("");
    expect(window.scrollY).toBe(840);
    expect(scrollToSpy).not.toHaveBeenCalled();

    unlock();
    expect(window.scrollY).toBe(840);
    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(snapshot.scrollY).toBe(840);
  });
});
