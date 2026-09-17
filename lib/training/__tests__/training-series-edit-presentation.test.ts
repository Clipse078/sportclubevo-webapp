import { describe, expect, it } from "vitest";
import {
  buildTrainingRecordPrimaryTitle,
  formatTrainingSeriesEditHeaderMeta,
  formatTrainingSeriesScheduleRail,
} from "@/lib/training/training-series-edit-presentation";
import type { TrainingAllocationDto, TrainingSeriesDto } from "@/lib/training/types";

const baseSeries = {
  status: "ACTIVE" as const,
  weekdaySchedules: [{ weekday: "THURSDAY" as const, startsAt: "20:15", endsAt: "21:45" }],
};

const pitchAllocation: TrainingAllocationDto = {
  id: "a1",
  tenantId: "t1",
  trainingSeriesId: "s1",
  facilityResourceId: "r1",
  facilityResourceName: "Kunstrasen 3 A",
  facilityResourceCode: "KUNSTRASEN_3_A",
  facilityResourceType: "HALF_PITCH",
  facilityId: "f1",
  facilityName: "Sportanlage",
  notes: null,
  displayOrder: 0,
  createdAt: "",
  updatedAt: "",
};

describe("training-series-edit-presentation", () => {
  it("buildTrainingRecordPrimaryTitle avoids duplicated Training suffix", () => {
    expect(buildTrainingRecordPrimaryTitle("Junioren F2", "Junioren F2 Training")).toBe("Junioren F2 Training");
  });

  it("formats schedule rail with short weekday and time", () => {
    expect(formatTrainingSeriesScheduleRail(baseSeries)).toBe("Do · 20:15–21:45");
  });

  it("uses human resource names in header meta (not codes)", () => {
    const meta = formatTrainingSeriesEditHeaderMeta({
      series: baseSeries as Pick<TrainingSeriesDto, "weekdaySchedules" | "status">,
      allocations: [
        pitchAllocation,
        {
          ...pitchAllocation,
          id: "a2",
          facilityResourceId: "r2",
          facilityResourceName: "O4",
          facilityResourceCode: "O4",
          facilityResourceType: "DRESSING_ROOM",
        },
      ],
    });

    expect(meta.statusLabel).toBe("Aktiv");
    expect(meta.scheduleRail).toBe("Do · 20:15–21:45");
    expect(meta.pitchLabel).toBe("Kunstrasen 3 A");
    expect(meta.dressingRoomLabel).toBe("O4");
    expect(meta.pitchTypeLabel).toBe("Halbes Feld");
  });
});
