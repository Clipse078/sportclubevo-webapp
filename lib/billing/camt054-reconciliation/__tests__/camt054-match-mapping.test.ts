import { describe, expect, it } from "vitest";
import { classifyCamt054EntryOutcome } from "../camt054-match-mapping";

describe("classifyCamt054EntryOutcome", () => {
  it("maps exact match outcomes to MATCHED / QRR_EXACT", () => {
    expect(classifyCamt054EntryOutcome("planned")).toEqual({
      matchStatus: "MATCHED",
      matchMethod: "QRR_EXACT",
    });
  });

  it("maps duplicate to DUPLICATE", () => {
    expect(classifyCamt054EntryOutcome("skipped_duplicate")).toEqual({
      matchStatus: "DUPLICATE",
      matchMethod: "DUPLICATE_TRANSACTION",
    });
  });

  it("maps paid invoice to review required", () => {
    expect(classifyCamt054EntryOutcome("skipped_invoice_not_payable", "PAID")).toEqual({
      matchStatus: "REVIEW_REQUIRED",
      matchMethod: "INVOICE_ALREADY_PAID",
    });
  });
});
