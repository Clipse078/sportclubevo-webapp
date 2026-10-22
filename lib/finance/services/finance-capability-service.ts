import type { FinanceCapabilityKey, PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceAdmin,
  requireFinanceView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import {
  FINANCE_DEFAULT_ENABLED_CAPABILITIES,
  FINANCE_SYSTEM_CAPABILITY_KEYS,
  isFinanceCapabilityImplemented,
} from "@/lib/finance/capability-registry";
import { logAction } from "@/lib/audit/log-action";

type Db = Pick<PrismaClient, "financeTenantCapability">;

function assertKnownCapability(capability: FinanceCapabilityKey): void {
  if (!(FINANCE_SYSTEM_CAPABILITY_KEYS as readonly string[]).includes(capability)) {
    throw new FinanceDomainError("FINANCE_INVALID_CAPABILITY", "Unknown finance capability.");
  }
}

export async function ensureDefaultFinanceCapabilities(db: Db, tenantId: string) {
  for (const capability of FINANCE_DEFAULT_ENABLED_CAPABILITIES) {
    await db.financeTenantCapability.upsert({
      where: { tenantId_capability: { tenantId, capability } },
      create: { tenantId, capability, enabled: true },
      update: {},
    });
  }
}

export async function listTenantFinanceCapabilities(db: Db, ctx: FinanceAuthContext) {
  requireFinanceView(ctx);
  return db.financeTenantCapability.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { capability: "asc" },
  });
}

export async function setFinanceCapabilityEnabled(
  db: Db,
  ctx: FinanceAuthContext,
  capability: FinanceCapabilityKey,
  enabled: boolean,
) {
  requireFinanceAdmin(ctx);
  assertKnownCapability(capability);
  if (enabled && !isFinanceCapabilityImplemented(capability)) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_CAPABILITY",
      "This capability is not yet available in the product.",
    );
  }

  const row = await db.financeTenantCapability.upsert({
    where: { tenantId_capability: { tenantId: ctx.tenantId, capability } },
    create: { tenantId: ctx.tenantId, capability, enabled },
    update: { enabled },
  });

  await logAction({
    moduleKey: "finance",
    action: "capability.updated",
    entityType: "FinanceTenantCapability",
    entityId: row.id,
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    metadataJson: { capability, enabled },
  }).catch(() => undefined);

  return row;
}

export async function getEnabledFinanceCapabilities(
  db: Db,
  tenantId: string,
): Promise<Set<FinanceCapabilityKey>> {
  const rows = await db.financeTenantCapability.findMany({
    where: { tenantId, enabled: true },
    select: { capability: true },
  });
  return new Set(rows.map((r) => r.capability));
}
