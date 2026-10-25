/**
 * FIN-06A — publication lifecycle invariants.
 */

import { FinanceDomainError } from "@/lib/finance/errors";
import {
  FINANCE_PUBLICATION_LIFECYCLE,
  type FinancePublicationLifecycleStatus,
} from "@/lib/finance/publishing/finance-publishing-sharing-architecture-contract";

export function assertFinancePublicationLifecycleTransition(
  from: FinancePublicationLifecycleStatus,
  to: FinancePublicationLifecycleStatus,
): void {
  if (from === to) return;
  const allowed = FINANCE_PUBLICATION_LIFECYCLE.allowedTransitions[from];
  if (!(allowed as readonly string[]).includes(to)) {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_INVALID_TRANSITION",
      `Publication cannot transition from ${from} to ${to}.`,
      409,
    );
  }
}

export function assertPublishedPublicationVersionImmutable(
  lifecycleStatus: FinancePublicationLifecycleStatus,
): void {
  if (lifecycleStatus === "PUBLISHED" || lifecycleStatus === "SUPERSEDED") {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_IMMUTABLE",
      "Published publication versions cannot be mutated in place.",
      409,
    );
  }
}
