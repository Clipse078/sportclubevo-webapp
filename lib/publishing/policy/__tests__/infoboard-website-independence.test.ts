/**
 * Tournament Center 01E1 — Infoboard publication is independent of websiteVisible.
 */

import { describe, expect, it } from "vitest";
import { evaluatePublication } from "../publication-policy";

const TENANT = "tenant-fca";

describe("Infoboard vs websiteVisible (tournaments)", () => {
  const base = {
    tenantId: TENANT,
    type: "TOURNAMENT",
    status: "SCHEDULED",
    infoboardVisible: true,
    websiteVisible: false,
    trainingsplanVisible: false,
    homeAway: "HOME",
  };

  it("websiteVisible=false + infoboardVisible=true remains Infoboard-eligible", () => {
    expect(evaluatePublication(base, "INFOBOARD_SCREEN_1", TENANT).eligible).toBe(true);
    expect(evaluatePublication(base, "INFOBOARD_SCREEN_2", TENANT).eligible).toBe(true);
  });

  it("infoboardVisible=false excludes from Infoboard regardless of websiteVisible", () => {
    const hidden = { ...base, infoboardVisible: false, websiteVisible: true };
    expect(evaluatePublication(hidden, "INFOBOARD_SCREEN_1", TENANT).reason).toBe(
      "INFOBOARD_HIDDEN",
    );
  });
});
