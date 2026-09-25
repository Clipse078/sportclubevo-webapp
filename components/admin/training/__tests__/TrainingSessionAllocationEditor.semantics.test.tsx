/**
 * @vitest-environment jsdom
 *
 * TRAININGCENTER-UX-03R2 — resource semantic icons + secondary change action
 */

import type { ComponentProps } from "react";
import { NextIntlClientProvider } from "next-intl";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import deMessages from "@/messages/de.json";
import { TrainingSessionAllocationEditor } from "@/components/admin/training/TrainingSessionAllocationEditor";
import type { TrainingAllocationDto } from "@/lib/training/types";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";

const PITCH_GROUPS: FacilityGroup[] = [
  {
    facilityId: "facility-pitch",
    facilityName: "Kunstrasen 2",
    facilityType: "PITCH",
    resources: [
      {
        id: "res-pitch-a",
        name: "Kunstrasen 2 A",
        code: "KUNSTRASEN_2_A",
        type: "HALF_PITCH",
        facilityId: "facility-pitch",
        facilityName: "Kunstrasen 2",
        facilityType: "PITCH",
      },
    ],
  },
];

const DRESSING_GROUPS: FacilityGroup[] = [
  {
    facilityId: "facility-dressing",
    facilityName: "Garderoben",
    facilityType: "DRESSING_ROOM_BLOCK",
    resources: [
      {
        id: "res-dressing-e1",
        name: "E1",
        code: "E1",
        type: "DRESSING_ROOM",
        facilityId: "facility-dressing",
        facilityName: "Garderoben",
        facilityType: "DRESSING_ROOM_BLOCK",
      },
    ],
  },
];

const seriesPitch: TrainingAllocationDto[] = [
  {
    id: "series-pitch",
    tenantId: "tenant-1",
    trainingSeriesId: "series-1",
    facilityResourceId: "res-pitch-a",
    facilityResourceName: "Kunstrasen 2 A",
    facilityResourceCode: "KUNSTRASEN_2_A",
    facilityResourceType: "HALF_PITCH",
    facilityId: "facility-pitch",
    facilityName: "Kunstrasen 2",
    notes: null,
    displayOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const seriesDressing: TrainingAllocationDto[] = [
  {
    id: "series-dressing",
    tenantId: "tenant-1",
    trainingSeriesId: "series-1",
    facilityResourceId: "res-dressing-e1",
    facilityResourceName: "E1",
    facilityResourceCode: "E1",
    facilityResourceType: "DRESSING_ROOM",
    facilityId: "facility-dressing",
    facilityName: "Garderoben",
    notes: null,
    displayOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

function renderEditor(
  props: Partial<ComponentProps<typeof TrainingSessionAllocationEditor>> = {},
) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      <TrainingSessionAllocationEditor
        sessionId="session-1"
        initialAllocations={[]}
        seriesAllocations={seriesPitch}
        facilityGroups={PITCH_GROUPS}
        canManage
        sessionStartAt="2026-09-28T15:00:00.000Z"
        sessionEndAt="2026-09-28T16:30:00.000Z"
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("TrainingSessionAllocationEditor — UX-03R2 semantics", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ availability: [] }),
        } as Response),
      ),
    );
  });

  it("A — pitch resource uses green semantic icon tile", () => {
    renderEditor();
    const pitchRow = screen.getByTestId("training-session-allocation-name-pitch-hall");
    const tile = pitchRow.querySelector('[data-testid="facility-resource-semantic-icon-tile"]');
    expect(tile).toBeTruthy();
    expect(tile?.className).toMatch(/emerald/);
  });

  it("B — dressing-room resource uses blue semantic icon tile", () => {
    render(
      <NextIntlClientProvider locale="de" messages={deMessages}>
        <TrainingSessionAllocationEditor
          sessionId="session-1"
          initialAllocations={[]}
          seriesAllocations={seriesDressing}
          facilityGroups={DRESSING_GROUPS}
          canManage
          sessionStartAt="2026-09-28T15:00:00.000Z"
          sessionEndAt="2026-09-28T16:30:00.000Z"
        />
      </NextIntlClientProvider>,
    );
    const dressingRow = screen.getByTestId("training-session-allocation-name-dressing-room");
    const tile = dressingRow.querySelector('[data-testid="facility-resource-semantic-icon-tile"]');
    expect(tile).toBeTruthy();
    expect(tile?.className).toMatch(/blue/);
  });

  it("C/D/E/F — secondary Ändern opens picker; cancel closes; resource visible; picker closed by default", () => {
    renderEditor();

    expect(screen.getByTestId("training-session-allocation-name-pitch-hall")).toHaveTextContent(
      "Kunstrasen 2 A",
    );
    expect(screen.queryByTestId("training-session-allocations-pitch-hall-picker")).not.toBeInTheDocument();

    const changeButton = screen.getByTestId("training-session-allocations-pitch-hall-change");
    expect(changeButton).toHaveClass("fca-button-secondary");
    expect(changeButton).toHaveTextContent("Ändern");

    fireEvent.click(changeButton);
    expect(screen.getByTestId("training-session-allocations-pitch-hall-picker")).toBeInTheDocument();
    expect(screen.getByTestId("training-session-allocation-name-pitch-hall")).toHaveTextContent(
      "Kunstrasen 2 A",
    );

    fireEvent.click(screen.getByTestId("training-session-allocation-add-pitch-hall-cancel"));
    expect(screen.queryByTestId("training-session-allocations-pitch-hall-picker")).not.toBeInTheDocument();
  });

  it("R — canManage=false hides change actions", () => {
    renderEditor({ canManage: false });
    expect(screen.queryByTestId("training-session-allocations-pitch-hall-change")).not.toBeInTheDocument();
  });
});
