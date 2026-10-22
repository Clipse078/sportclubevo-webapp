"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireTenantContext } from "@/lib/tenants/active-tenant";
import type { CanonicalAccountSemantic } from "@prisma/client";
import {
  archiveFinancialAccount,
  createFinancialAccount,
  deleteFinancialAccountWhenSafe,
  moveFinancialAccountToReportingGroup,
  renameFinancialAccount,
  reorderFinancialAccount,
  reactivateFinancialAccount,
} from "@/lib/finance/services/financial-account-service";
import {
  archiveFinancialReportingGroup,
  createFinancialReportingGroup,
  deleteFinancialReportingGroupWhenSafe,
  renameFinancialReportingGroup,
  reorderFinancialReportingGroup,
  reparentFinancialReportingGroup,
  reactivateFinancialReportingGroup,
} from "@/lib/finance/services/financial-reporting-group-service";
import {
  applyFinanceStructureTemplate,
  previewFinanceStructureTemplate,
} from "@/lib/finance/services/finance-structure-template-service";

async function structureActionContext(): Promise<FinanceAuthContext> {
  const session = await requireAnyPermission([
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_STRUCTURE_MANAGE,
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

export type FinanceStructureActionResult =
  | { ok: true }
  | { ok: false; error: string };

function toResult(error: unknown): FinanceStructureActionResult {
  if (error instanceof FinanceDomainError) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Action failed." };
}

function revalidateFinanceStructure() {
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/finance/structure");
}

export async function createReportingGroupAction(input: {
  name: string;
  parentId?: string | null;
}): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    await createFinancialReportingGroup(prisma, ctx, input);
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function renameReportingGroupAction(
  id: string,
  name: string,
): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    await renameFinancialReportingGroup(prisma, ctx, id, name);
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function reparentReportingGroupAction(
  id: string,
  parentId: string | null,
): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    await reparentFinancialReportingGroup(prisma, ctx, id, parentId);
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function reorderReportingGroupAction(
  id: string,
  sortOrder: number,
): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    await reorderFinancialReportingGroup(prisma, ctx, id, sortOrder);
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function archiveReportingGroupAction(
  id: string,
): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    await archiveFinancialReportingGroup(prisma, ctx, id);
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function reactivateReportingGroupAction(
  id: string,
): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    await reactivateFinancialReportingGroup(prisma, ctx, id);
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function deleteReportingGroupAction(
  id: string,
): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    await deleteFinancialReportingGroupWhenSafe(prisma, ctx, id);
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function createFinancialAccountAction(input: {
  name: string;
  reportingGroupId: string;
  canonicalSemantic: CanonicalAccountSemantic;
}): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    await createFinancialAccount(prisma, ctx, input);
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function renameFinancialAccountAction(
  id: string,
  name: string,
): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    await renameFinancialAccount(prisma, ctx, id, name);
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function moveFinancialAccountAction(
  id: string,
  reportingGroupId: string,
): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    await moveFinancialAccountToReportingGroup(prisma, ctx, id, reportingGroupId);
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function reorderFinancialAccountAction(
  id: string,
  sortOrder: number,
): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    await reorderFinancialAccount(prisma, ctx, id, sortOrder);
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function archiveFinancialAccountAction(
  id: string,
): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    await archiveFinancialAccount(prisma, ctx, id);
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function reactivateFinancialAccountAction(
  id: string,
): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    await reactivateFinancialAccount(prisma, ctx, id);
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function deleteFinancialAccountAction(
  id: string,
): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    await deleteFinancialAccountWhenSafe(prisma, ctx, id);
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function applyStructureTemplateAction(
  templateKey: string,
): Promise<FinanceStructureActionResult> {
  try {
    const ctx = await structureActionContext();
    const t = await getTranslations("Finance");
    await applyFinanceStructureTemplate(prisma, ctx, {
      templateKey,
      resolveLabel: (nameKey) => t(nameKey as Parameters<typeof t>[0]),
    });
    revalidateFinanceStructure();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function previewStructureTemplateAction(templateKey: string) {
  try {
    await structureActionContext();
    return { ok: true as const, preview: await previewFinanceStructureTemplate(templateKey) };
  } catch (e) {
    return { ok: false as const, error: e instanceof FinanceDomainError ? e.message : "Action failed." };
  }
}
