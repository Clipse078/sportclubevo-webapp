import { prisma } from "@/lib/db/prisma";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { getEnabledFinanceCapabilities } from "@/lib/finance/services/finance-capability-service";
import { loadFinanceSetupSnapshot } from "@/lib/finance/services/finance-configuration-service";
import { resolveFinanceOverviewState } from "@/lib/finance/setup/finance-setup-state";
import { resolveFinanceNavigation } from "@/lib/finance/navigation/finance-navigation";
import { resolveFinanceOverviewReportingSlice } from "@/lib/finance/reporting/reporting-overview-state";
import { loadApprovedBudgetReportingReadModel } from "@/lib/finance/services/finance-reporting-query-service";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolveFinanceFormattingLocale } from "@/lib/finance/presentation/resolve-finance-formatting-locale";
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

  const showBudgetNav = navigation.some((item) => item.key === "budget");
  const showActualsNav = navigation.some((item) => item.key === "actuals");

  const reportingReadModel = await loadApprovedBudgetReportingReadModel(prisma, ctx, null);
  const overviewReporting = resolveFinanceOverviewReportingSlice({
    reporting: reportingReadModel,
  });

  const formattingLocale = resolveFinanceFormattingLocale(tenant);

  return {
    session,
    tenant,
    formattingLocale,
    ctx,
    snapshot,
    overviewState,
    setupConfigured,
    enabledCapabilities,
    navigation,
    showBudgetNav,
    showActualsNav,
    canAdmin: permissionKeys.has(PERMISSIONS.FINANCE_ADMIN),
    canStructure: permissionKeys.has(PERMISSIONS.FINANCE_STRUCTURE_MANAGE),
    canBudgetManage: permissionKeys.has(PERMISSIONS.FINANCE_BUDGET_MANAGE),
    canBudgetApprove:
      permissionKeys.has(PERMISSIONS.FINANCE_APPROVE) ||
      permissionKeys.has(PERMISSIONS.FINANCE_ADMIN),
    canActualView:
      permissionKeys.has(PERMISSIONS.FINANCE_VIEW) ||
      permissionKeys.has(PERMISSIONS.FINANCE_ACTUAL_VIEW),
    canActualManage:
      permissionKeys.has(PERMISSIONS.FINANCE_ACTUAL_MANAGE) ||
      permissionKeys.has(PERMISSIONS.FINANCE_ADMIN),
    overviewReporting,
  };
}
