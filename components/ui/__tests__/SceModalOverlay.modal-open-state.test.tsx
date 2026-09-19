/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, afterEach } from "vitest";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
import {
  resetSceModalOpenStateForTests,
  SCE_MODAL_OPEN_ATTR,
} from "@/lib/ui/sce-modal-open-state";

describe("SceModalOverlay modal-open marker SCE-RESPONSIVE-01O", () => {
  afterEach(() => {
    resetSceModalOpenStateForTests();
    document.body.innerHTML = "";
    document.documentElement.style.overflow = "";
  });

  it("sets html data-sce-modal-open while overlay is open", async () => {
    const { unmount } = render(
      <SceModalOverlay open testId="modal-open-marker">
        <div>Panel</div>
      </SceModalOverlay>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("modal-open-marker")).toBeInTheDocument();
    });
    expect(document.documentElement.getAttribute(SCE_MODAL_OPEN_ATTR)).toBe("1");

    unmount();
    expect(document.documentElement.hasAttribute(SCE_MODAL_OPEN_ATTR)).toBe(false);
  });
});
