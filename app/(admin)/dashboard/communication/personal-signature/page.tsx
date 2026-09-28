import Link from "next/link";
import { PageShell } from "@/components/ui/page";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import PersonalSignatureWorkspace from "@/components/admin/communication/personal-signature/PersonalSignatureWorkspace";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERSONAL_SIGNATURE_ROUTE_PERMISSIONS } from "@/lib/communication/personal-signature/route-access";
import { loadPersonalSignaturePreference } from "@/lib/communication/personal-signature/personal-signature-service";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";

export const dynamic = "force-dynamic";

export default async function PersonalSignaturePage() {
  await requireAnyPermission(PERSONAL_SIGNATURE_ROUTE_PERMISSIONS);
  const session = await auth();
  const tenant = await getActiveTenant();
  const userId = session?.user?.id;
  if (!tenant || !userId) {
    return null;
  }

  const preference = await loadPersonalSignaturePreference(tenant.id, userId);

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Persönliche Signatur" },
        ]}
        title="Persönliche Signatur"
        description="Eigene Signatur für Mitteilungen, Direktnachrichten und Antworten im Kommunikationscenter."
        secondaryActions={
          <Link
            href="/dashboard/communication/email-sender"
            className="text-sm font-medium text-[var(--sce-primary)] underline-offset-2 hover:underline"
          >
            E-Mail-Absender (Verein)
          </Link>
        }
      />
      <PersonalSignatureWorkspace initialPreference={preference} />
    </PageShell>
  );
}
