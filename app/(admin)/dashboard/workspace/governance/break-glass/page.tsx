import { notFound } from "next/navigation";

import { BreakGlassGovernancePanel } from "@/components/admin/workspace/BreakGlassGovernancePanel";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";

export default async function WorkspaceBreakGlassPage() {
  const session = await requireAnyPermission([
    PERMISSIONS.WORKSPACE_BREAK_GLASS,
    PERMISSIONS.WORKSPACE_GOVERNANCE_MANAGE,
  ]);
  const tenantId = session.user?.activeTenantId;
  const viewerUserId = session.user?.effectiveUserId ?? session.user?.id;
  if (!tenantId || !viewerUserId) notFound();

  const effective = await getRequestEffectivePermissions(viewerUserId, tenantId);
  const permissionKeys = [...effective.platform, ...effective.tenant];
  const canActivate = permissionKeys.includes(PERMISSIONS.WORKSPACE_BREAK_GLASS);

  return (
    <PageShell widthMode="operational">
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: "Dokumente", href: "/dashboard/workspace" },
          { label: "Break-Glass" },
        ]}
        header={{
          eyebrow: "Governance",
          title: "Workspace Break-Glass",
          description:
            "Explizite, zeitlich begrenzte Ausnahme für dokumentierte Governance-Fälle (nur Lesezugriff im definierten Umfang).",
        }}
      >
        {canActivate ? (
          <BreakGlassGovernancePanel />
        ) : (
          <p className="text-sm text-[var(--text-2)]">
            Sie verfügen über Governance-Verwaltungsrechte, jedoch nicht über
            Break-Glass-Aktivierung. Widerruf erfolgt über die Governance-API.
          </p>
        )}
      </SceWorkspaceChrome>
    </PageShell>
  );
}
