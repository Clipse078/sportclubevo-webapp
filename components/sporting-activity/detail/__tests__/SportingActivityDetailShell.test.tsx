/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SportingActivityDetailShell } from "../SportingActivityDetailShell";
import { SportingActivityDetailSkeleton } from "../SportingActivityDetailSkeleton";
import { buildTrainingActivityPresentation } from "@/lib/sporting-activity-presentation/builders";
import { SportingActivityDetailContent } from "../SportingActivityDetailContent";
import type { SportingActivityDetail } from "@/lib/sporting-activity-detail/types";

vi.mock("@/lib/ui/use-sce-modal-dialog", () => ({
  useSceModalDialog: vi.fn(),
}));

describe("SportingActivityDetailShell", () => {
  it("opens with accessible title and closes", () => {
    const onClose = vi.fn();
    render(
      <SportingActivityDetailShell open onClose={onClose} title="Aktivität">
        <p>Body</p>
      </SportingActivityDetailShell>,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Aktivität" })).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Schließen"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("SportingActivityDetail loading and content", () => {
  it("renders skeleton with accessible busy state", () => {
    render(<SportingActivityDetailSkeleton />);
    expect(screen.getByTestId("sporting-activity-detail-skeleton")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("renders training detail identity sections", () => {
    const presentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:1",
      title: "Junioren F2 Training",
      typeLabel: "Training",
      teamName: "Junioren F2",
      clubName: "FC Allschwil",
      startAt: new Date("2026-10-05T15:00:00.000Z"),
      endAt: new Date("2026-10-05T16:30:00.000Z"),
    });

    const detail: SportingActivityDetail = {
      resourceKey: "training-session:1",
      kind: "TRAINING",
      presentation,
      teamLabel: "Junioren F2",
    };

    render(
      <SportingActivityDetailContent
        detail={detail}
        fmtCfg={{ locale: "de-CH", timezone: "Europe/Zurich" }}
      />,
    );

    expect(screen.getByTestId("sporting-activity-detail-content")).toHaveAttribute(
      "data-activity-kind",
      "TRAINING",
    );
    expect(screen.getByRole("heading", { name: "Junioren F2 Training" })).toBeTruthy();
    expect(screen.getByText("Mein Team")).toBeTruthy();
    expect(screen.queryByText("Treffpunkt")).toBeNull();
  });
});
