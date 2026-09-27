import CommunicationInboxWorkspace from "@/components/admin/communication/inbox/CommunicationInboxWorkspace";
import { Badge } from "@/components/ui/Badge";
import { PageBreadcrumbs, PageHeader, PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { INBOX_VIEW_PERMISSIONS } from "@/lib/communication/inbox/route-access";

export const dynamic = "force-dynamic";

export default async function CommunicationInboxPage() {
  await requireAnyPermission(INBOX_VIEW_PERMISSIONS);

  return (
    <PageShell>
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Kommunikationscenter" },
        ]}
      />
      <PageHeader
        eyebrow="Kommunikation"
        title="Kommunikationscenter"
        description="Nachrichten, E-Mails und offene Kommunikation zentral bearbeiten."
        badge={<Badge variant="success">Verfügbar</Badge>}
      />
      <CommunicationInboxWorkspace />
    </PageShell>
  );
}
