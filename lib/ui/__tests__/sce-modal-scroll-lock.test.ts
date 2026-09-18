/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  captureSceDocumentScrollSnapshot,
  lockSceDocumentScroll,
} from "@/lib/ui/sce-modal-scroll-lock";

describe("sce-modal-scroll-lock SCE-RESPONSIVE-01D", () => {
  const scrollToSpy = vi.fn();

  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(scrollToSpy);
    Object.defineProperty(window, "scrollX", { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 840, writable: true, configurable: true });
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preserves scroll position when applying and releasing lock", () => {
    const snapshot = captureSceDocumentScrollSnapshot();
    expect(snapshot.scrollY).toBe(840);

    const unlock = lockSceDocumentScroll();
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("hidden");
    expect(window.scrollY).toBe(840);
    expect(scrollToSpy).not.toHaveBeenCalled();

    unlock();
    expect(window.scrollY).toBe(840);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("lockSceDocumentScroll restores prior overflow styles on cleanup", () => {
    document.body.style.overflow = "auto";
    const unlock = lockSceDocumentScroll();
    expect(document.body.style.overflow).toBe("hidden");
    unlock();
    expect(document.body.style.overflow).toBe("auto");
  });
});
