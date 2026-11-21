import { describe, expect, it } from "vitest";
import {
  CD_STRATEGY_PROGRESS_COPY,
  describeDeliveryProgressUnknown,
  describeOutcomeProgressUnknown,
} from "../strategy-progress-presentation";

describe("strategy progress presentation", () => {
  it("explains missing outcome without implying 0%", () => {
    expect(describeOutcomeProgressUnknown([])).toBe(
      CD_STRATEGY_PROGRESS_COPY.outcomeUnknownNoMetrics,
    );
    expect(
      describeOutcomeProgressUnknown([{ targetValue: 0, currentValue: 0, direction: "INCREASE" }]),
    ).toBe(CD_STRATEGY_PROGRESS_COPY.outcomeUnknownNotComputable);
  });

  it("explains missing delivery without implying 0%", () => {
    expect(
      describeDeliveryProgressUnknown({ linkedInitiativeCount: 0, initiativesWithEligibleTasks: 0 }),
    ).toBe(CD_STRATEGY_PROGRESS_COPY.deliveryUnknownNoInitiatives);
    expect(
      describeDeliveryProgressUnknown({ linkedInitiativeCount: 2, initiativesWithEligibleTasks: 0 }),
    ).toBe(CD_STRATEGY_PROGRESS_COPY.deliveryUnknownNoEligibleTasks);
    expect(
      describeDeliveryProgressUnknown({ linkedInitiativeCount: 1, initiativesWithEligibleTasks: 1 }),
    ).toBeNull();
  });

  it("uses club-language delivery labels instead of English Delivery", () => {
    expect(CD_STRATEGY_PROGRESS_COPY.deliveryLabel).toBe("Umsetzungsfortschritt");
    expect(CD_STRATEGY_PROGRESS_COPY.deliveryLabel).not.toMatch(/Delivery/i);
  });
});