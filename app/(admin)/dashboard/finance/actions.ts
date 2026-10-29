"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { FinanceDomainError } from "@/lib/finance/errors";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireTenantContext } from "@/lib/tenants/active-tenant";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  markFinanceSetupConfigured,
  setFinanceBaseCurrency,
} from "@/lib/finance/services/finance-configuration-service";
import {
  createFinanceYear,
  updateFinanceYear,
} from "@/lib/finance/services/finance-year-service";
import {
  ensureDefaultFinanceCapabilities,
  setFinanceCapabilityEnabled,
} from "@/lib/finance/services/finance-capability-service";
import { saveFinanceCommitmentApprovalPolicy } from "@/lib/finance/services/finance-commitment-approval-policy-service";
import type { FinanceCapabilityKey } from "@prisma/client";

async function financeActionContext(): Promise<FinanceAuthContext> {
  const session = await requireAnyPermission([
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_ADMIN,
  ]);
  const tenant = await requireTenantContext();
  const userId = session.user!.id;
  const { platform, tenant: tenantPerms } = await getRequestEffectivePermissions(
    userId,
    tenant.id,
  );
  return {
    tenantId: tenant.id,
    userId,
    permissionKeys: new Set<string>([...platform, ...tenantPerms]),
  };
}

export type FinanceActionResult =
  | { ok: true }
  | { ok: false; error: string };

function toResult(error: unknown): FinanceActionResult {
  if (error instanceof FinanceDomainError) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Action failed." };
}

export async function saveFinanceBaseCurrencyAction(
  baseCurrency: string,
): Promise<FinanceActionResult> {
  try {
    const ctx = await financeActionContext();
    await setFinanceBaseCurrency(prisma, ctx, baseCurrency);
    await ensureDefaultFinanceCapabilities(prisma, ctx.tenantId);
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/settings");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function createFinanceYearAction(input: {
  name: string;
  startDate: string;
  endDate: string;
}): Promise<FinanceActionResult> {
  try {
    const ctx = await financeActionContext();
    await createFinanceYear(prisma, ctx, {
      name: input.name,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    });
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/settings");
    revalidatePath("/dashboard/finance/budget");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function updateFinanceYearAction(input: {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}): Promise<FinanceActionResult> {
  try {
    const ctx = await financeActionContext();
    await updateFinanceYear(prisma, ctx, input.id, {
      name: input.name,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    });
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/settings");
    revalidatePath("/dashboard/finance/budget");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function completeFinanceSetupAction(): Promise<FinanceActionResult> {
  try {
    const ctx = await financeActionContext();
    await markFinanceSetupConfigured(prisma, ctx);
    await ensureDefaultFinanceCapabilities(prisma, ctx.tenantId);
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/settings");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function saveFinanceCommitmentApprovalPolicyAction(input: {
  enabled: boolean;
  thresholdAmountMinor: number;
}): Promise<FinanceActionResult> {
  try {
    const ctx = await financeActionContext();
    await saveFinanceCommitmentApprovalPolicy(prisma, ctx, input);
    revalidatePath("/dashboard/finance/settings");
    revalidatePath("/dashboard/finance/commitments");
    revalidatePath("/dashboard/finance/commitments/approvals");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function setFinanceCapabilityAction(
  capability: FinanceCapabilityKey,
  enabled: boolean,
): Promise<FinanceActionResult> {
  try {
    const ctx = await financeActionContext();
    await setFinanceCapabilityEnabled(prisma, ctx, capability, enabled);
    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/settings");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}
