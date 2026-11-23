import "server-only";

import type { ActorContext } from "@/lib/visibility/actor-context";
import { lookupTenantPublicRecordReference } from "@/lib/tenant-public-reference/sce-tenant-record-reference-lookup";

export type TenantTaskReferenceLookupResult =
  | {
      kind: "task";
      id: string;
      publicReference: string;
      title: string;
      legacyScePublicReference: string | null;
      recordKindLabelKey: string;
    }
  | null;

/**
 * Permission-aware exact lookup for tenant-wide references (TASK rows today) and legacy SCE task refs.
 */
export async function lookupTenantTaskReference(
  actor: ActorContext,
  referenceInput: string,
): Promise<TenantTaskReferenceLookupResult> {
  const hit = await lookupTenantPublicRecordReference(actor, referenceInput);
  if (!hit || hit.kind !== "task") return null;
  return {
    kind: "task",
    id: hit.id,
    publicReference: hit.publicReference,
    title: hit.title,
    legacyScePublicReference: hit.legacyScePublicReference,
    recordKindLabelKey: hit.recordKindLabelKey,
  };
}