/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  applySceModalOpenSideEffects,
  releaseSceModalOpenSideEffects,
} from "@/lib/ui/sce-modal-open-lifecycle";

describe("sce-modal-open-lifecycle SCE-RESPONSIVE-01P", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does not call window.scrollTo during open or close", () => {
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    const background = document.createElement("div");
    background.setAttribute("data-sce-modal-background", "");
    const trigger = document.createElement("button");
    const title = document.createElement("h2");
    title.tabIndex = -1;
    background.append(trigger);
    document.body.append(background, title);

    trigger.focus();
    const { previousFocus } = applySceModalOpenSideEffects({
      initialFocusTarget: title,
      backgroundRoots: [background],
    });

    expect(background.getAttribute("aria-hidden")).toBe("true");
    expect(scrollToSpy).not.toHaveBeenCalled();

    releaseSceModalOpenSideEffects({
      backgroundRoots: [background],
      previousFocus,
    });

    expect(scrollToSpy).not.toHaveBeenCalled();
    scrollToSpy.mockRestore();
  });
});
