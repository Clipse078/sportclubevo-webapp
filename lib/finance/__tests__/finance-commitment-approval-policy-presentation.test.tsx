/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import deMessages from "@/messages/de.json";
import { FinanceCommitmentApprovalExplanationText } from "@/components/admin/finance/commitment/FinanceCommitmentApprovalExplanation";
import {
  buildDraftApprovalPreviewExplanation,
  resolveFinanceCommitmentDraftSubmitMessageKey,
} from "@/lib/finance/commitment/finance-commitment-approval-policy-presentation";
import { evaluateFinanceCommitmentApprovalRequirement } from "@/lib/finance/commitment/finance-commitment-approval-policy-evaluation";

const policy = {
  enabled: true,
  thresholdAmountMinor: 1_000_00,
  thresholdCurrency: "CHF",
};

function draftExplanation(amountMinor: number) {
  const evaluation = evaluateFinanceCommitmentApprovalRequirement({
    policy,
    amountMinor,
    currency: "CHF",
  });
  return buildDraftApprovalPreviewExplanation({
    evaluationKind: evaluation.explanationKind,
    thresholdAmountMinor: policy.thresholdAmountMinor,
    thresholdCurrency: policy.thresholdCurrency,
    approvalRequired: evaluation.approvalRequired,
  });
}

describe("FIN-07D approval policy presentation", () => {
  it("draft submit CTA keys follow the same evaluation as preview explanation", () => {
    const below = draftExplanation(999_00);
    const exact = draftExplanation(1_000_00);
    const above = draftExplanation(1_001_00);

    expect(below.approvalRequired).toBe(false);
    expect(exact.approvalRequired).toBe(true);
    expect(above.approvalRequired).toBe(true);

    expect(resolveFinanceCommitmentDraftSubmitMessageKey(below)).toBe("submitActionDirect");
    expect(resolveFinanceCommitmentDraftSubmitMessageKey(exact)).toBe("submitAction");
    expect(resolveFinanceCommitmentDraftSubmitMessageKey(above)).toBe("submitAction");
  });

  it("formats threshold with tenant formatting locale (de-CH apostrophe grouping)", () => {
    const explanation = draftExplanation(999_00);
    render(
      <NextIntlClientProvider locale="de" messages={deMessages}>
        <FinanceCommitmentApprovalExplanationText
          explanation={explanation}
          formattingLocale="de-CH"
          t={(key, values) => {
            const template =
              deMessages.Finance.commitments.workspace[
                key as keyof typeof deMessages.Finance.commitments.workspace
              ];
            if (typeof template !== "string") return key;
            return template.replace("{threshold}", String(values?.threshold ?? ""));
          }}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/1'000 CHF/)).toBeTruthy();
    expect(screen.queryByText(/1\.000 CHF/)).toBeNull();
  });
});
