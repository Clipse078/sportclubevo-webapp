import { describe, expect, it } from "vitest";
import { formatBillingMoney } from "../format-billing-money";
import {
  presentInvoiceStatus,
  presentSubscriptionStatus,
} from "../billing-status-presentation";

describe("billing presentation", () => {
  it("formats money with Stripe currency via Intl", () => {
    const formatted = formatBillingMoney(19900, "chf");
    expect(formatted).toMatch(/199/);
    expect(formatted.toLowerCase()).toContain("chf");
  });

  it("formats USD without hard-coding CHF", () => {
    const formatted = formatBillingMoney(21512, "usd");
    expect(formatted).toMatch(/215/);
  });

  it("maps known subscription statuses", () => {
    expect(presentSubscriptionStatus("active").label).toBe("Aktiv");
    expect(presentSubscriptionStatus("past_due").label).toBe("Überfällig");
  });

  it("renders unknown subscription status safely", () => {
    const result = presentSubscriptionStatus("weird_state");
    expect(result.label).toBe("weird_state");
    expect(result.tone).toBe("muted");
  });

  it("maps invoice statuses without defaulting unknown to paid", () => {
    expect(presentInvoiceStatus("open").label).toBe("Offen");
    expect(presentInvoiceStatus("mystery").label).toBe("mystery");
  });
});
