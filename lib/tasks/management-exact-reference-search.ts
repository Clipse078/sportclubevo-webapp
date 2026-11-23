import type { Prisma } from "@prisma/client";
import { parseScePublicReference } from "@/lib/club-development/sce-public-reference";
import { parseTenantPublicReference } from "@/lib/tenant-public-reference/sce-tenant-public-reference";
import { resolveTenantPublicReferenceFromLedger } from "@/lib/tenant-public-reference/sce-tenant-public-reference-lookup";
import { SceTenantPublicRecordKind } from "@prisma/client";

export type ExactTaskReferenceFilter =
  | { mode: "tenant-ledger-task"; taskId: string }
  | { mode: "legacy-sce"; scePublicNumber: bigint }
  | null;

export async function parseExactTaskReferenceSearch(
  search: string,
  actorTenantId: string,
  tenantShortCode: string | null | undefined,
): Promise<ExactTaskReferenceFilter> {
  const trimmed = search.trim();
  if (!trimmed) return null;

  const tenantParsed = parseTenantPublicReference(trimmed);
  if (tenantParsed) {
    const code = tenantShortCode?.trim().toUpperCase();
    if (!code || tenantParsed.shortCode !== code) return null;
    const hit = await resolveTenantPublicReferenceFromLedger(actorTenantId, trimmed);
    if (hit?.recordKind === SceTenantPublicRecordKind.TASK) {
      return { mode: "tenant-ledger-task", taskId: hit.entityId };
    }
    return null;
  }

  const sceParsed = parseScePublicReference(trimmed);
  if (sceParsed) {
    return { mode: "legacy-sce", scePublicNumber: sceParsed.sequenceNumber };
  }

  return null;
}

export function exactTaskReferenceWhere(
  tenantId: string,
  filter: ExactTaskReferenceFilter,
): Prisma.TaskWhereInput | null {
  if (!filter) return null;
  if (filter.mode === "tenant-ledger-task") {
    return { tenantId, id: filter.taskId };
  }
  return { tenantId, scePublicNumber: filter.scePublicNumber };
}