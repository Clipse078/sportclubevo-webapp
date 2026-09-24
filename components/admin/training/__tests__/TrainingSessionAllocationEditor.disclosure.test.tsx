/**
 * @vitest-environment jsdom
 *
 * TRAININGCENTER-UX-03R1 — progressive disclosure for session resource overrides.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TrainingSessionAllocationEditor } from "@/components/admin/training/TrainingSessionAllocationEditor";
import type { TrainingAllocationDto } from "@/lib/training/types";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";

const FACILITY_GROUPS: FacilityGroup[] = [
  {
    facilityId: "facility-1",
    facilityName: "Kunstrasen 2",
    resources: [
      {
        id: "res-pitch-a",
        name: "Kunstrasen 2 A",
        code: "KUNSTRASEN_2_A",
        type: "HALF_PITCH",
        facilityId: "facility-1",
        facilityName: "Kunstrasen 2",
      },
    ],
  },
];

const seriesAllocations: TrainingAllocationDto[] = [
  {
    id: "series-pitch",
    tenantId: "tenant-1",
    trainingSeriesId: "series-1",
    facilityResourceId: "res-pitch-a",
    facilityResourceName: "Kunstrasen 2 A",
    facilityResourceCode: "KUNSTRASEN_2_A",
    facilityResourceType: "HALF_PITCH",
    facilityId: "facility-1",
    facilityName: "Kunstrasen 2",
    notes: null,
    displayOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

function jsonResponse(data: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response;
}

describe("TrainingSessionAllocationEditor — UX-03R1 disclosure", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.startsWith("/api/facilities/availability")) {
          return Promise.resolve(jsonResponse({ availability: [] }));
        }
        return Promise.resolve(jsonResponse({}));
      }),
    );
  });

  it("renders inherited allocation compactly with human display name and closed picker by default", () => {
    render(
      <TrainingSessionAllocationEditor
        sessionId="session-1"
        initialAllocations={[]}
        seriesAllocations={seriesAllocations}
        facilityGroups={FACILITY_GROUPS}
        canManage
        sessionStartAt="2026-09-28T15:00:00.000Z"
        sessionEndAt="2026-09-28T16:30:00.000Z"
      />,
    );

    expect(screen.getByTestId("training-session-allocation-name-pitch-hall")).toHaveTextContent("Kunstrasen 2 A");
    expect(screen.getByTestId("training-session-allocations-pitch-hall-inherit-badge")).toHaveTextContent(
      "Serienstandard",
    );
    expect(screen.queryByTestId("training-session-allocations-pitch-hall-picker")).not.toBeInTheDocument();
    expect(screen.queryByTestId("training-session-allocation-add-pitch-hall-select")).not.toBeInTheDocument();
  });

  it("opens picker on Ändern and closes on cancel without mutation", async () => {
    const fetchMock = vi.mocked(global.fetch);

    render(
      <TrainingSessionAllocationEditor
        sessionId="session-1"
        initialAllocations={[]}
        seriesAllocations={seriesAllocations}
        facilityGroups={FACILITY_GROUPS}
        canManage
        sessionStartAt="2026-09-28T15:00:00.000Z"
        sessionEndAt="2026-09-28T16:30:00.000Z"
      />,
    );

    fireEvent.click(screen.getByTestId("training-session-allocations-pitch-hall-change"));
    expect(screen.getByTestId("training-session-allocations-pitch-hall-picker")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("training-session-allocations-pitch-hall-picker-cancel"));
    await waitFor(() => {
      expect(screen.queryByTestId("training-session-allocations-pitch-hall-picker")).not.toBeInTheDocument();
    });

    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/training-sessions/session-1/allocations"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not import decorative drag-handle icons", () => {
    const source = readFileSync(
      join(process.cwd(), "components/admin/training/TrainingSessionAllocationEditor.tsx"),
      "utf8",
    );
    expect(source).not.toContain("GripVertical");
  });
});
