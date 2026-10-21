import AuditLogsTable from "@/components/admin/logs/AuditLogsTable";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";

export default async function LogsPage() {
  await requirePermission(PERMISSIONS.USERS_MANAGE);

  return (
    <PageShell widthMode="operational">
      <SceWorkspaceChrome
        density="dense"
        breadcrumbs={[
          { label: "Administration", href: "/dashboard/admin" },
          { label: "Audit Logs" },
        ]}
        header={{
          eyebrow: "Administration",
          title: "Audit Logs",
          description: "Übersicht der letzten protokollierten Änderungen im System.",
        }}
      >
        <AuditLogsTable />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
