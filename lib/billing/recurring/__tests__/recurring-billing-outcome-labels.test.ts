import { describe, expect, it } from "vitest";
import { presentRecurringBillingOutcomeDe } from "../recurring-billing-outcome-labels";

describe("recurring billing outcome labels (DE)", () => {
  it("maps preview and skip outcomes for PO acceptance", () => {
    expect(presentRecurringBillingOutcomeDe("PREVIEW_WOULD_CREATE")).toBe(
      "Vorschau: würde erstellt",
    );
    expect(presentRecurringBillingOutcomeDe("SKIPPED_ALREADY_INVOICED")).toBe(
      "Bereits abgerechnet",
    );
    expect(presentRecurringBillingOutcomeDe("SKIPPED_NOT_DUE")).toBe("Noch nicht fällig");
  });
});
