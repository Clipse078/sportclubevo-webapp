import type { ReactNode } from "react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { requireActiveTenantId } from "@/lib/tenants/active-tenant";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { TENANT_ROLES_VIEW } from "@/lib/roles/access";
import { PageShell } from "@/components/ui/page";
import { SceInformationSurface } from "@/components/sce/information";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import RoleScopeBadge from "@/components/admin/roles/RoleScopeBadge";
import RolesAdminTabs from "@/components/admin/roles/RolesAdminTabs";
import {
  SCE_TEXT_EXPANSION_SAFE_CLASS,
  SCE_WORKSPACE_HEADER_ACTIONS_CLASS,
} from "@/lib/design-system/sce-responsive-accessibility-micro-ux";

type LayoutProps = { children: ReactNode };

/**
 * Tenant Roles & Permissions module shell (RPERM-05).
 *
 * `tenantId` is resolved server-side from `requireActiveTenantId()` (never a
 * client-submitted value) and passed explicitly into `requireAnyPermission`
 * so this layout — and every page nested under it — is gated by a live
 * `(permission, tenant)` check against `EffectivePermissionResolver`, not
 * the JWT-cached `session.user.permissionKeys` snapshot. A platform Super
 * Admin with no tenant membership never resolves a `tenantId` here and is
 * redirected before any tenant role data is fetched.
 */
export default async function TenantRolesLayout({ children }: LayoutProps) {
  const tenantId = await requireActiveTenantId();
  await requireAnyPermission(TENANT_ROLES_VIEW, tenantId);
  const tenant = await getActiveTenant();

  return (
    <PageShell widthMode="operational">
      <SceWorkspaceChrome
        density="dense"
        breadcrumbs={[
          { label: "Administration", href: "/dashboard/administration" },
          { label: "Rollen & Berechtigungen" },
        ]}
        header={{
          eyebrow: "Administration",
          title: "Rollen & Berechtigungen",
          description:
            "Mandanten-Rollen, Berechtigungsmatrix, Benutzerzuweisungen und effektiver Zugriff für diesen Mandanten.",
          secondaryActions: (
            <div className={SCE_WORKSPACE_HEADER_ACTIONS_CLASS}>
              <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
                <ProductDomainSceIcon
                  name="roles-access"
                  size={16}
                  className="h-4 w-4 shrink-0 text-[var(--muted)]"
                />
                <span className={`text-sm font-semibold text-[var(--foreground)] ${SCE_TEXT_EXPANSION_SAFE_CLASS}`}>
                  {tenant?.name ?? "Aktiver Mandant"}
                </span>
                <RoleScopeBadge scope="TENANT" />
              </div>
            </div>
          ),
        }}
        contextTabs={<RolesAdminTabs />}
      >
        <SceInformationSurface variant="flat" testId="roles-admin-information-surface">
          {children}
        </SceInformationSurface>
      </SceWorkspaceChrome>
    </PageShell>
  );
}
