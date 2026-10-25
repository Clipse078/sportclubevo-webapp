/**
 * FIN-06B — validate persisted publication snapshot payloads.
 */

import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinancePublicationSnapshotPayloadV1 } from "@/lib/finance/publishing/finance-publication-snapshot-types";
import { FINANCE_PUBLICATION_SNAPSHOT_SCHEMA_VERSION } from "@/lib/finance/publishing/finance-publication-reporting-semantic-version";

export function parseFinancePublicationSnapshotPayloadV1(
  value: unknown,
): FinancePublicationSnapshotPayloadV1 {
  if (!value || typeof value !== "object") {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_INVALID_SNAPSHOT",
      "Publication snapshot payload is invalid.",
      500,
    );
  }
  const payload = value as FinancePublicationSnapshotPayloadV1;
  if (payload.schemaVersion !== FINANCE_PUBLICATION_SNAPSHOT_SCHEMA_VERSION) {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_INVALID_SNAPSHOT",
      "Publication snapshot schema version is not supported.",
      500,
    );
  }
  if (!payload.tenantId?.trim() || !payload.publicationId?.trim()) {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_INVALID_SNAPSHOT",
      "Publication snapshot is missing identity fields.",
      500,
    );
  }
  if (!payload.currencyCode?.trim()) {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_INVALID_SNAPSHOT",
      "Publication snapshot is missing currency identity.",
      500,
    );
  }
  if (typeof payload.publicationVersion !== "number" || payload.publicationVersion < 1) {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_INVALID_SNAPSHOT",
      "Publication snapshot version number is invalid.",
      500,
    );
  }
  if (!payload.renderedReportingSemanticPayload) {
    throw new FinanceDomainError(
      "FINANCE_PUBLICATION_INVALID_SNAPSHOT",
      "Publication snapshot is missing reporting semantic payload.",
      500,
    );
  }
  return payload;
}
