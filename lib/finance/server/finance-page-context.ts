import { prisma } from "@/lib/db/prisma";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { getEnabledFinanceCapabilities } from "@/lib/finance/services/finance-capability-service";
import { loadFinanceSetupSnapshot } from "@/lib/finance/services/finance-configuration-service";
import { resolveFinanceOverviewState } from "@/lib/finance/setup/finance-setup-state";
import { resolveFinanceNavigation } from "@/lib/finance/navigation/finance-navigation";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireTenantContext } from "@/lib/tenants/active-tenant";

export async function loadFinanceWorkspaceContext() {
  const session = await requireAnyPermission([PERMISSIONS.FINANCE_VIEW]);
  const tenant = await requireTenantContext();
  const userId = session.user!.id;
  const { platform, tenant: tenantPerms } = await getRequestEffectivePermissions(
    userId,
    tenant.id,
  );
  const permissionKeys = new Set<string>([...platform, ...tenantPerms]);

  const ctx: FinanceAuthContext = {
    tenantId: tenant.id,
    userId,
    permissionKeys,
  };

  const snapshot = await loadFinanceSetupSnapshot(prisma, ctx);
  const overviewState = resolveFinanceOverviewState(snapshot);
  const setupConfigured = snapshot.configuration?.setupStatus === "CONFIGURED";
  const enabledCapabilities = await getEnabledFinanceCapabilities(prisma, tenant.id);
  const navigation = resolveFinanceNavigation({
    ctx,
    enabledCapabilities,
    setupConfigured,
  });

  return {
    session,
    tenant,
    ctx,
    snapshot,
    overviewState,
    setupConfigured,
    enabledCapabilities,
    navigation,
    canAdmin: permissionKeys.has(PERMISSIONS.FINANCE_ADMIN),
    canStructure: permissionKeys.has(PERMISSIONS.FINANCE_STRUCTURE_MANAGE),
    canBudgetManage: permissionKeys.has(PERMISSIONS.FINANCE_BUDGET_MANAGE),
    canBudgetApprove:
      permissionKeys.has(PERMISSIONS.FINANCE_APPROVE) ||
      permissionKeys.has(PERMISSIONS.FINANCE_ADMIN),
  };
}
