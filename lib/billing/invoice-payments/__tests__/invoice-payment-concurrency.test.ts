import { describe, expect, it, vi } from "vitest";
import { NativeBillingConflictError, NativeBillingValidationError } from "../../native-billing-types";

/**
 * Simulates two concurrent record attempts against the same outstanding balance.
 * Only the first should succeed; the second must fail when outstanding is exhausted.
 */
describe("invoice payment concurrency (simulated)", () => {
  it("only one of two full-balance payments can succeed", async () => {
    let paidTotal = 0;
    const gross = 21512;
    const outstanding = () => Math.max(0, gross - paidTotal);

    const attemptPayment = async (amount: number) => {
      const available = outstanding();
      if (available <= 0) {
        throw new NativeBillingConflictError("Die Rechnung ist bereits vollständig bezahlt.");
      }
      if (amount > available) {
        throw new NativeBillingValidationError(
          "Der Betrag übersteigt den offenen Rechnungsbetrag.",
        );
      }
      await new Promise((r) => setTimeout(r, Math.random() * 5));
      const again = outstanding();
      if (amount > again) {
        throw new NativeBillingValidationError(
          "Der Betrag übersteigt den offenen Rechnungsbetrag.",
        );
      }
      paidTotal += amount;
      return amount;
    };

    const results = await Promise.allSettled([
      attemptPayment(21512),
      attemptPayment(21512),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(paidTotal).toBe(21512);
  });
});
