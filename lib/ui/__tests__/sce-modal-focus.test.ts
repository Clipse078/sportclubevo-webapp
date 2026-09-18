/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { sceFocusWithoutScroll } from "@/lib/ui/sce-modal-focus";

describe("sceFocusWithoutScroll", () => {
  it("calls focus with preventScroll when supported", () => {
    const button = document.createElement("button");
    document.body.appendChild(button);
    const focusSpy = vi.spyOn(button, "focus");

    sceFocusWithoutScroll(button);

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });
});
