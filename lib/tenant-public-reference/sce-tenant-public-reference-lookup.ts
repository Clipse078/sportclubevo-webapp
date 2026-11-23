import "server-only";

import { SceTenantPublicRecordKind } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  formatTenantPublicReference,
  parseTenantPublicReference,
} from "./sce-tenant-public-reference";
import { sceTenantPublicRecordKindLabelKey } from "./sce-tenant-public-record-kind";

export type TenantPublicReferenceLedgerHit = {
  tenantId: string;
  tenantPublicNumber: bigint;
  recordKind: SceTenantPublicRecordKind;
  entityId: string;
  publicReference: string;
  /** i18n key for visible record-type label */
  recordKindLabelKey: string;
};

async function loadTenantShortCodeForActor(
  actorTenantId: string,
): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: actorTenantId },
    select: { publicReferenceShortCode: true },
  });
  return tenant?.publicReferenceShortCode ?? null;
}

export async function resolveTenantPublicReferenceFromLedger(
  actorTenantId: string,
  referenceInput: string,
): Promise<TenantPublicReferenceLedgerHit | null> {
  const trimmed = referenceInput.trim();
  const parsed = parseTenantPublicReference(trimmed);
  if (!parsed) return null;

  const tenantShortCode = await loadTenantShortCodeForActor(actorTenantId);
  if (!tenantShortCode || parsed.shortCode !== tenantShortCode.toUpperCase()) {
    return null;
  }

  const ledger = await prisma.sceTenantPublicNumberLedger.findUnique({
    where: {
      tenantId_tenantPublicNumber: {
        tenantId: actorTenantId,
        tenantPublicNumber: parsed.tenantPublicNumber,
      },
    },
    select: {
      tenantId: true,
      tenantPublicNumber: true,
      recordKind: true,
      entityId: true,
    },
  });
  if (!ledger) return null;

  return {
    tenantId: ledger.tenantId,
    tenantPublicNumber: ledger.tenantPublicNumber,
    recordKind: ledger.recordKind,
    entityId: ledger.entityId,
    publicReference: formatTenantPublicReference(
      tenantShortCode,
      ledger.tenantPublicNumber,
    ),
    recordKindLabelKey: sceTenantPublicRecordKindLabelKey(ledger.recordKind),
  };
}