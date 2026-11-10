import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import UserForm from "@/components/admin/users/UserForm";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

export default async function NewUserPage() {
  const session = await requirePermission("users.manage");

  if (session.user?.activeTenantId) {
    redirect("/dashboard/admin/people-access/new");
  }

  return (
    <PageShell>
      <FormPagePattern
        eyebrow="Benutzerverwaltung"
        title="Neuer Benutzer"
        description="Lege ein neues Benutzerkonto für die WebApp an. Das temporäre Passwort sollte nach dem ersten Login geändert werden."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Benutzer", href: "/dashboard/users" },
          { label: "Neu" },
        ]}
        cancelAction={
          <Link href="/dashboard/users" className="fca-button-secondary">
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>
        }
      >
      {/* Form section */}
      <div className="sce-detail-section">
        <div className="sce-detail-section-header">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Kontoinformationen
          </p>
        </div>
        <div className="sce-detail-section-body">
          <UserForm mode="create" />
        </div>
      </div>
      </FormPagePattern>
    </PageShell>
  );
}
