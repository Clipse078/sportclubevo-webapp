import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchPlanningHubFacilityGroupsClient,
  resetPlanningHubFacilityGroupsClientFetch,
} from "../fetch-facility-groups-client";

describe("fetchPlanningHubFacilityGroupsClient", () => {
  beforeEach(() => {
    resetPlanningHubFacilityGroupsClientFetch();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          PITCH_HALL: [{ id: "f1", name: "Hauptfeld", resources: [] }],
          DRESSING_ROOM: [],
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetPlanningHubFacilityGroupsClientFetch();
  });

  it("dedupes concurrent in-flight requests", async () => {
    const [a, b] = await Promise.all([
      fetchPlanningHubFacilityGroupsClient(),
      fetchPlanningHubFacilityGroupsClient(),
    ]);
    expect(a).toBe(b);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reset allows a fresh fetch after server revalidation", async () => {
    await fetchPlanningHubFacilityGroupsClient();
    resetPlanningHubFacilityGroupsClientFetch();
    await fetchPlanningHubFacilityGroupsClient();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
