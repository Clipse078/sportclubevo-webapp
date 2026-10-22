import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceAdmin,
  requireFinanceView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { deriveSetupStatusAfterMutation } from "@/lib/finance/setup/finance-setup-state";
import { assertSameTenant, isIso4217Currency } from "@/lib/finance/tenant-scope";
import { logAction } from "@/lib/audit/log-action";

type Db = Pick<
  PrismaClient,
  "financeConfiguration" | "financeYear" | "financeTenantCapability" | "financeBudgetVersion"
>;

type FinanceConfigurationDb = Pick<PrismaClient, "financeConfiguration">;

export async function getFinanceConfiguration(db: Db, tenantId: string) {
  return db.financeConfiguration.findUnique({ where: { tenantId } });
}

/** Ensures a configuration row exists without mutating unrelated fields (e.g. baseCurrency). */
export async function ensureFinanceConfigurationRow(
  db: FinanceConfigurationDb,
  tenantId: string,
) {
  return db.financeConfiguration.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  });
}

export async function setFinanceBaseCurrency(
  db: Db,
  ctx: FinanceAuthContext,
  baseCurrency: string,
) {
  requireFinanceAdmin(ctx);
  const normalized = baseCurrency.trim().toUpperCase();
  if (!isIso4217Currency(normalized)) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_CURRENCY",
      "Base currency must be a valid ISO 4217 code.",
    );
  }

  const yearCount = await db.financeYear.count({ where: { tenantId: ctx.tenantId } });
  const existing = await ensureFinanceConfigurationRow(db, ctx.tenantId);

  if (existing.baseCurrency && existing.baseCurrency !== normalized) {
    const approvedBaselineCount = await db.financeBudgetVersion.count({
      where: {
        status: "APPROVED",
        budget: { tenantId: ctx.tenantId },
      },
    });
    if (approvedBaselineCount > 0) {
      throw new FinanceDomainError(
        "FINANCE_INVALID_CURRENCY",
        "Base currency cannot change while approved financial baselines exist.",
        409,
      );
    }
  }

  const setupStatus = deriveSetupStatusAfterMutation({
    baseCurrency: normalized,
    financeYearCount: yearCount,
    previous: existing.setupStatus,
  });

  const updated = await db.financeConfiguration.update({
    where: { tenantId: ctx.tenantId },
    data: {
      baseCurrency: normalized,
      setupStatus,
    },
  });

  await logAction({
    moduleKey: "finance",
    action: "configuration.base_currency_updated",
    entityType: "FinanceConfiguration",
    entityId: updated.id,
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    metadataJson: { baseCurrency: normalized },
  }).catch(() => undefined);

  return updated;
}

export async function markFinanceSetupConfigured(db: Db, ctx: FinanceAuthContext) {
  requireFinanceAdmin(ctx);
  const config = await ensureFinanceConfigurationRow(db, ctx.tenantId);
  if (!config.baseCurrency) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_CURRENCY",
      "Configure a base currency before completing finance setup.",
    );
  }
  const yearCount = await db.financeYear.count({ where: { tenantId: ctx.tenantId } });
  if (yearCount === 0) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_YEAR",
      "Create at least one financial year before completing finance setup.",
    );
  }

  const updated = await db.financeConfiguration.update({
    where: { tenantId: ctx.tenantId },
    data: {
      setupStatus: "CONFIGURED",
      configuredAt: new Date(),
    },
  });

  await logAction({
    moduleKey: "finance",
    action: "configuration.setup_completed",
    entityType: "FinanceConfiguration",
    entityId: updated.id,
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
  }).catch(() => undefined);

  return updated;
}

export async function setCurrentFinanceYear(
  db: Db,
  ctx: FinanceAuthContext,
  financeYearId: string,
) {
  requireFinanceAdmin(ctx);
  const year = await db.financeYear.findUnique({ where: { id: financeYearId } });
  if (!year) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial year not found.", 404);
  }
  assertSameTenant(year.tenantId, ctx.tenantId, "Financial year");

  const config = await ensureFinanceConfigurationRow(db, ctx.tenantId);
  return db.financeConfiguration.update({
    where: { id: config.id },
    data: { currentFinanceYearId: financeYearId },
  });
}

export async function loadFinanceSetupSnapshot(db: Db, ctx: FinanceAuthContext) {
  requireFinanceView(ctx);
  const [configuration, financeYearCount, enabledCapabilityCount] = await Promise.all([
    getFinanceConfiguration(db, ctx.tenantId),
    db.financeYear.count({ where: { tenantId: ctx.tenantId } }),
    db.financeTenantCapability.count({
      where: { tenantId: ctx.tenantId, enabled: true },
    }),
  ]);
  return { configuration, financeYearCount, enabledCapabilityCount };
}
