import type { CanonicalAccountSemantic } from "@prisma/client";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";

export type BudgetReadinessIssueCode =
  | "BASE_CURRENCY_REQUIRED"
  | "NO_PLANNED_LINES"
  | "INVALID_LINE_AMOUNT"
  | "LINE_ON_ARCHIVED_ACCOUNT"
  | "APPROVED_BASELINE_ALREADY_EXISTS"
  | "NO_CURRENT_BASELINE_FOR_REBASELINE"
  | "VERSION_NOT_DRAFT";

export type BudgetReadinessIssue = {
  code: BudgetReadinessIssueCode;
  severity: "blocker" | "warning";
};

export type BudgetApprovalReadiness = {
  canApprove: boolean;
  issues: BudgetReadinessIssue[];
};

export type BudgetApprovalReadinessMode = "FIRST_APPROVAL" | "REBASELINE";

type ReadinessLine = {
  amountMinor: number;
  financialAccountId: string;
  financialAccount: {
    lifecycle: "ACTIVE" | "ARCHIVED";
    canonicalSemantic: CanonicalAccountSemantic;
  };
};

function evaluateSharedBudgetReadiness(input: {
  versionStatus: "DRAFT" | "APPROVED";
  baseCurrency: string | null;
  lines: ReadonlyArray<ReadinessLine>;
}): BudgetReadinessIssue[] {
  const issues: BudgetReadinessIssue[] = [];

  if (input.versionStatus !== "DRAFT") {
    issues.push({ code: "VERSION_NOT_DRAFT", severity: "blocker" });
  }

  const currency = input.baseCurrency?.trim().toUpperCase() ?? "";
  if (!currency) {
    issues.push({ code: "BASE_CURRENCY_REQUIRED", severity: "blocker" });
  }

  if (input.lines.length === 0) {
    issues.push({ code: "NO_PLANNED_LINES", severity: "blocker" });
  }

  for (const line of input.lines) {
    try {
      assertSafeAmountMinor(line.amountMinor);
    } catch {
      issues.push({ code: "INVALID_LINE_AMOUNT", severity: "blocker" });
      break;
    }
    if (line.financialAccount.lifecycle === "ARCHIVED") {
      issues.push({ code: "LINE_ON_ARCHIVED_ACCOUNT", severity: "warning" });
    }
  }

  return issues;
}

export function evaluateBudgetApprovalReadiness(input: {
  mode: BudgetApprovalReadinessMode;
  versionStatus: "DRAFT" | "APPROVED";
  baseCurrency: string | null;
  lines: ReadonlyArray<ReadinessLine>;
  currentBaselineExists: boolean;
}): BudgetApprovalReadiness {
  const issues = evaluateSharedBudgetReadiness(input);

  if (input.mode === "FIRST_APPROVAL" && input.currentBaselineExists) {
    issues.push({ code: "APPROVED_BASELINE_ALREADY_EXISTS", severity: "blocker" });
  }

  if (input.mode === "REBASELINE" && !input.currentBaselineExists) {
    issues.push({ code: "NO_CURRENT_BASELINE_FOR_REBASELINE", severity: "blocker" });
  }

  const canApprove = !issues.some((issue) => issue.severity === "blocker");
  return { canApprove, issues };
}
