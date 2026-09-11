import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import { SectionCard } from "@/components/ui/page";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { resolveWorkspaceContextFromSessionUser } from "@/lib/workspace/workspace-context";

export default async function PlatformDashboardPage() {
  const session = await auth();
  const workspaceContext = resolveWorkspaceContextFromSessionUser(session?.user);

  if (workspaceContext !== "platform") {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminSectionHeader
        eyebrow="Platform"
        title="SportClubEvo Platform"
        description="Verwalte Vereine, kommerzielle Abläufe und Plattform-Services von diesem Workspace aus. Operative Club-Module sind hier bewusst nicht verfügbar."
      />

      <SectionCard
        title="Platform Workspace"
        description="Dies ist der minimale Einstieg für Platform Super Admins ohne aktiven Verein."
      >
        <p className="text-sm text-[var(--text-2)]">
          Nutze die Navigation links für Clubs, Commercial, Integrationen, Zugriff &
          Sicherheit sowie Operations. KPI-Dashboards und erweiterte Platform-Module folgen in
          späteren Shell-Slices.
        </p>
      </SectionCard>
    </div>
  );
}
