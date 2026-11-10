import { PageShell, SectionCard } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
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
    <PageShell>
      <ListPagePattern
        eyebrow="Platform"
        title="SportClubEvo Platform"
        description="Verwalte Vereine, kommerzielle Abläufe und Plattform-Services von diesem Workspace aus. Operative Club-Module sind hier bewusst nicht verfügbar."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Platform" },
        ]}
      >
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
      </ListPagePattern>
    </PageShell>
  );
}
