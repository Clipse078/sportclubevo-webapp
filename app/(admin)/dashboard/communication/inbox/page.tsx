import Link from "next/link";
import { Settings2 } from "lucide-react";
import { DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/direct/route-access";
import CommunicationInboxWorkspace from "@/components/admin/communication/inbox/CommunicationInboxWorkspace";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { PageShell } from "@/components/ui/page";
import {
  INBOX_MANAGE_PERMISSIONS,
  INBOX_REPLY_PERMISSIONS,
  INBOX_SETTINGS_PERMISSIONS,
  INBOX_VIEW_PERMISSIONS,
} from "@/lib/communication/inbox/authorization";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";

export const dynamic = "force-dynamic";

function tenantHasAnyPermission(
  tenantPermissions: readonly string[],
  required: readonly string[],
): boolean {
  return required.some((permission) => tenantPermissions.includes(permission));
}

export default async function CommunicationInboxPage() {
  const session = await requireAnyPermission(INBOX_VIEW_PERMISSIONS);
  const effective = await getRequestEffectivePermissions(
    session.user.id,
    session.user.activeTenantId ?? undefined,
  );
  const tenantPermissions = effective.tenant ?? [];

  const canSettings = tenantHasAnyPermission(tenantPermissions, INBOX_SETTINGS_PERMISSIONS);
  const canReply = tenantHasAnyPermission(tenantPermissions, INBOX_REPLY_PERMISSIONS);
  const canManage = tenantHasAnyPermission(tenantPermissions, INBOX_MANAGE_PERMISSIONS);
  const canDirectSend = tenantHasAnyPermission(tenantPermissions, DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS);

  const neueNachrichtAction = canDirectSend ? (
    <Link
      href="/dashboard/communication/inbox/new"
      className="inline-flex items-center gap-2 rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
    >
      Neue Nachricht
    </Link>
  ) : undefined;

  const settingsAction = canSettings ? (
    <Link
      href="/dashboard/communication/inbox/settings"
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
    >
      <Settings2 className="h-4 w-4" aria-hidden />
      Postfach-Einstellungen
    </Link>
  ) : undefined;

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Kommunikationscenter" },
        ]}
        title="Kommunikationscenter"
        description="Nachrichten und Antworten zentral bearbeiten."
        primaryAction={neueNachrichtAction ?? settingsAction}
        secondaryActions={neueNachrichtAction && settingsAction ? settingsAction : undefined}
      />
      <CommunicationContentSurface padded={false} className="overflow-hidden p-4 md:p-5">
        <CommunicationInboxWorkspace
          currentUserId={session.user.id}
          canReply={canReply}
          canManage={canManage}
          canSettings={canSettings}
        />
      </CommunicationContentSurface>
    </PageShell>
  );
}
