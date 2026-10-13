import type { SceActivityApprovalDecision, SceActivityApprovalStrategyKind } from "./types";

export type EvaluateApprovalCompletionInput = {
  strategy: SceActivityApprovalStrategyKind;
  /** Person ids who already recorded APPROVE for this revision. */
  approvePersonIds: readonly string[];
  requiredApproveCount?: number;
};

/**
 * V1: ANY_ONE — one valid approval completes the submission.
 * Future THRESHOLD_FUTURE may supply requiredApproveCount without changing revision binding.
 */
export function isApprovalCompleteForRevision(input: EvaluateApprovalCompletionInput): boolean {
  if (input.strategy === "ANY_ONE") {
    return input.approvePersonIds.length >= 1;
  }
  const required = input.requiredApproveCount ?? 1;
  return input.approvePersonIds.length >= required;
}

export type AssertApproverMayDecideInput = {
  approverPersonId: string;
  creatorPersonId: string;
  decision: SceActivityApprovalDecision;
  approverIsAuthorizedValidator: boolean;
};

export type AssertApproverMayDecideResult =
  | { ok: true }
  | { ok: false; reason: "SELF_APPROVAL_DENIED" | "NOT_AUTHORIZED_VALIDATOR" };

/** V1: creators cannot APPROVE their own submission. Other decisions still require validator role. */
export function assertApproverMayDecide(
  input: AssertApproverMayDecideInput,
): AssertApproverMayDecideResult {
  if (!input.approverIsAuthorizedValidator) {
    return { ok: false, reason: "NOT_AUTHORIZED_VALIDATOR" };
  }
  if (
    input.decision === "APPROVE" &&
    input.approverPersonId === input.creatorPersonId
  ) {
    return { ok: false, reason: "SELF_APPROVAL_DENIED" };
  }
  return { ok: true };
}

export function validatorMayApproveWithoutCreatePermission(): true {
  return true;
}
