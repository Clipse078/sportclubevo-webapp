import { notFound } from "next/navigation";
import EmailSenderWorkspace from "@/components/admin/communication/email-sender/EmailSenderWorkspace";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { PageShell } from "@/components/ui/page";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { EMAIL_SENDER_WORKSPACE_DESCRIPTION } from "@/lib/communication/email-sender-display";
import { loadEmailSenderWorkspaceViewModel } from "@/lib/communication/email-sender-workspace";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";
import { getActiveTenant } from "@/lib/tenants/active-tenant";

export const dynamic = "force-dynamic";

export default async function EmailSenderPage() {
  await requireAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const model = await loadEmailSenderWorkspaceViewModel(tenant.id);

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "E-Mail-Absender" },
        ]}
        title="E-Mail-Absender"
        description={EMAIL_SENDER_WORKSPACE_DESCRIPTION}
      />
      <ToastProvider>
        <EmailSenderWorkspace initialModel={model} />
      </ToastProvider>
    </PageShell>
  );
}
