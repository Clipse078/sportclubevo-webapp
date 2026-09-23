import { notFound } from "next/navigation";

import { WorkspaceAuditPanel } from "@/components/admin/workspace/WorkspaceAuditPanel";
import { PageHeader, PageShell } from "@/components/ui/page";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { listWorkspaceGovernanceAuditEvents } from "@/lib/workspace/audit/workspace-audit-read-service";

export default async function WorkspaceAuditPage() {
  const session = await requirePermission(PERMISSIONS.WORKSPACE_AUDIT_VIEW);
  const tenantId = session.user?.activeTenantId;
  const viewerUserId = session.user?.effectiveUserId ?? session.user?.id;
  if (!tenantId || !viewerUserId) notFound();

  const effective = await getRequestEffectivePermissions(viewerUserId, tenantId);
  const permissionKeys = [...effective.platform, ...effective.tenant];

  const initialData = await listWorkspaceGovernanceAuditEvents({
    tenantId,
    permissionKeys,
    viewerUserId,
    pageSize: 25,
  });

  return (
    <PageShell>
      <PageHeader
        title="Workspace-Sicherheitsaudit"
        description="Governance- und Sicherheitsereignisse für diesen Mandanten (ohne Dokumentinhalte)."
      />
      <WorkspaceAuditPanel initialData={initialData} />
    </PageShell>
  );
}
