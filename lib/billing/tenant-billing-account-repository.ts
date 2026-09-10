import { prisma } from "@/lib/db/prisma";
import type { TenantBillingAccountRecord } from "./tenant-billing-account-types";

const billingAccountSelect = {
  id: true,
  tenantId: true,
  stripeCustomerId: true,
  linkedAt: true,
  linkedByUserId: true,
  createdAt: true,
  updatedAt: true,
  dunningStatus: true,
  firstPaymentFailureAt: true,
  latestPaymentFailureAt: true,
  gracePeriodEndsAt: true,
  automaticallySuspendedAt: true,
  resolvedAt: true,
  lastDunningEventAt: true,
  dunningExemptUntil: true,
  dunningExemptNote: true,
  automaticDunningEnabled: true,
  lastStripeEventId: true,
} as const;

export async function findBillingAccountByTenantId(
  tenantId: string,
): Promise<TenantBillingAccountRecord | null> {
  return prisma.tenantBillingAccount.findUnique({
    where: { tenantId },
    select: billingAccountSelect,
  });
}

export async function findBillingAccountByStripeCustomerId(
  stripeCustomerId: string,
): Promise<TenantBillingAccountRecord | null> {
  return prisma.tenantBillingAccount.findUnique({
    where: { stripeCustomerId },
    select: billingAccountSelect,
  });
}

export async function findTenantIdByKey(tenantKey: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { key: tenantKey },
    select: { id: true },
  });
  return tenant?.id ?? null;
}

export async function tenantExistsById(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  return tenant !== null;
}

export async function createBillingAccount(input: {
  tenantId: string;
  stripeCustomerId: string;
  linkedByUserId: string;
}): Promise<TenantBillingAccountRecord> {
  const now = new Date();
  return prisma.tenantBillingAccount.create({
    data: {
      tenantId: input.tenantId,
      stripeCustomerId: input.stripeCustomerId,
      linkedAt: now,
      linkedByUserId: input.linkedByUserId,
    },
    select: billingAccountSelect,
  });
}

export async function updateBillingAccountStripeCustomerId(input: {
  tenantId: string;
  stripeCustomerId: string;
  linkedByUserId: string;
}): Promise<TenantBillingAccountRecord> {
  const now = new Date();
  return prisma.tenantBillingAccount.update({
    where: { tenantId: input.tenantId },
    data: {
      stripeCustomerId: input.stripeCustomerId,
      linkedAt: now,
      linkedByUserId: input.linkedByUserId,
    },
    select: billingAccountSelect,
  });
}

export async function deleteBillingAccountByTenantId(tenantId: string): Promise<TenantBillingAccountRecord | null> {
  const existing = await findBillingAccountByTenantId(tenantId);
  if (!existing) return null;
  await prisma.tenantBillingAccount.delete({ where: { tenantId } });
  return existing;
}

export type LinkedTenantBillingAccountRow = {
  tenantId: string;
  tenantKey: string;
  tenantName: string;
  stripeCustomerId: string;
  dunningStatus: import("@prisma/client").BillingDunningStatus;
  gracePeriodEndsAt: Date | null;
  automaticDunningEnabled: boolean;
  dunningExemptUntil: Date | null;
};

export async function updateTenantBillingAccountDunning(
  tenantId: string,
  data: import("@prisma/client").Prisma.TenantBillingAccountUpdateInput,
): Promise<TenantBillingAccountRecord> {
  return prisma.tenantBillingAccount.update({
    where: { tenantId },
    data,
    select: billingAccountSelect,
  });
}

export async function findGracePeriodBillingAccountsDue(
  now: Date,
  take: number,
): Promise<TenantBillingAccountRecord[]> {
  return prisma.tenantBillingAccount.findMany({
    where: {
      dunningStatus: "GRACE_PERIOD",
      gracePeriodEndsAt: { lte: now },
      automaticDunningEnabled: true,
    },
    select: billingAccountSelect,
    orderBy: { gracePeriodEndsAt: "asc" },
    take,
  });
}

export async function findBillingAccountsForDunningReconciliation(
  take: number,
  skip: number,
): Promise<TenantBillingAccountRecord[]> {
  return prisma.tenantBillingAccount.findMany({
    where: {
      dunningStatus: { in: ["GRACE_PERIOD", "SUSPENDED", "REQUIRES_REVIEW", "RESOLVED"] },
    },
    select: billingAccountSelect,
    orderBy: { updatedAt: "asc" },
    take,
    skip,
  });
}

/** All tenants with a TenantBillingAccount row (bounded platform billing universe). */
export async function findAllLinkedTenantBillingAccounts(): Promise<
  LinkedTenantBillingAccountRow[]
> {
  const rows = await prisma.tenantBillingAccount.findMany({
    select: {
      stripeCustomerId: true,
      dunningStatus: true,
      gracePeriodEndsAt: true,
      automaticDunningEnabled: true,
      dunningExemptUntil: true,
      tenant: {
        select: { id: true, key: true, name: true },
      },
    },
    orderBy: { tenant: { name: "asc" } },
  });

  return rows.map((row) => ({
    tenantId: row.tenant.id,
    tenantKey: row.tenant.key,
    tenantName: row.tenant.name,
    stripeCustomerId: row.stripeCustomerId,
    dunningStatus: row.dunningStatus,
    gracePeriodEndsAt: row.gracePeriodEndsAt,
    automaticDunningEnabled: row.automaticDunningEnabled,
    dunningExemptUntil: row.dunningExemptUntil,
  }));
}
