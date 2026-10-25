import type { FinancePublicationSnapshotPayloadV1 } from "@/lib/finance/publishing/finance-publication-snapshot-types";

/** Client-safe publication snapshot (already ISO-serialized in v1 payload). */
export type SerializedFinancePublicationSnapshotPayload = FinancePublicationSnapshotPayloadV1;

export function serializeFinancePublicationSnapshotPayload(
  snapshot: FinancePublicationSnapshotPayloadV1,
): SerializedFinancePublicationSnapshotPayload {
  return structuredClone(snapshot);
}
