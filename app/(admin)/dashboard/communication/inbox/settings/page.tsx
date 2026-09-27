import CommunicationMailboxSettingsForm from "@/components/admin/communication/inbox/CommunicationMailboxSettingsForm";
import { Badge } from "@/components/ui/Badge";
import { PageBreadcrumbs, PageHeader, PageShell } from "@/components/ui/page";
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
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Kommunikationscenter", href: "/dashboard/communication/inbox" },
          { label: "Postfach-Einstellungen" },
        ]}
      />
      <PageHeader
        eyebrow="Kommunikationscenter"
        title="Postfach-Einstellungen"
        description="Inbound E-Mail/IMAP-Postfächer pro Verein konfigurieren."
        badge={<Badge variant="success">Verfügbar</Badge>}
      />
      <CommunicationMailboxSettingsForm
        initialMailboxes={mailboxes.map((mailbox) => ({
          ...mailbox,
          lastSyncSuccessAt: mailbox.lastSyncSuccessAt?.toISOString() ?? null,
        }))}
      />
    </PageShell>
  );
}
