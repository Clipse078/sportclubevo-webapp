import CommunicationMailboxSettingsForm from "@/components/admin/communication/inbox/CommunicationMailboxSettingsForm";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { PageShell } from "@/components/ui/page";
import { listCommunicationCenterMailboxes } from "@/lib/communication/inbox/mailbox-service";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { INBOX_SETTINGS_PERMISSIONS } from "@/lib/communication/inbox/route-access";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CommunicationInboxSettingsPage() {
  await requireAnyPermission(INBOX_SETTINGS_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const mailboxes = await listCommunicationCenterMailboxes(tenant.id);

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Kommunikationscenter", href: "/dashboard/communication/inbox" },
          { label: "Postfach-Einstellungen" },
        ]}
        title="Postfach-Einstellungen"
        description="Inbound E-Mail/IMAP-Postfächer pro Verein konfigurieren."
      />
      <CommunicationContentSurface>
        <CommunicationMailboxSettingsForm
          initialMailboxes={mailboxes.map((mailbox) => ({
            ...mailbox,
            lastSyncSuccessAt: mailbox.lastSyncSuccessAt?.toISOString() ?? null,
          }))}
        />
      </CommunicationContentSurface>
    </PageShell>
  );
}
