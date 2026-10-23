import type { LucideIcon } from "lucide-react";
import { Info } from "lucide-react";
import type { SceSemanticFeedbackTone } from "@/lib/design-system/sce-feedback-status-foundation";
import type { ManagementReviewSignalKind } from "@/lib/finance/actual/management-review-signals";

/** Inline management hints — restrained, not alert banners. */
export function financeManagementSignalPresentation(kind: ManagementReviewSignalKind): {
  tone: SceSemanticFeedbackTone;
  Icon: LucideIcon;
} {
  switch (kind) {
    case "ACCOUNTS_WITH_ACTUAL_NO_BUDGET":
    case "BUDGET_ACCOUNTS_WITHOUT_ACTUAL":
      return { tone: "INFO", Icon: Info };
  }
}
