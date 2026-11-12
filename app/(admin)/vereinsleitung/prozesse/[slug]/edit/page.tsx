import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getClubDevelopmentProcessBySlug } from "@/lib/club-development/process-queries";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import ProcessForm from "@/components/admin/club-development/ProcessForm";
import { ClubDevelopmentFormWorkflowShell } from "@/components/sce/club-development/ClubDevelopmentFormWorkflowShell";
import type { VisibilityScopeValue } from "@/components/admin/shared/VisibilityScopeSelect";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";
import { PERMISSIONS } from "@/lib/permissions/permissions";

type PageProps = { params: Promise<{ slug: string }> };

export default async function EditProcessPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  if (!actor.permissionKeys.includes(PERMISSIONS.INITIATIVES_MANAGE)) {
    notFound();
  }

  const process = await getClubDevelopmentProcessBySlug(slug, actor);
  if (!process) notFound();

  function parseStringArray(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((v): v is string => typeof v === "string");
  }

  const defaultValues = {
    title: process.title,
    summary: process.summary ?? "",
    description: process.description ?? "",
    status: process.status,
    owner: process.owner ?? "",
    ownerPersonId: process.ownerPersonId ?? undefined,
    visibilityScope: process.visibilityScope as VisibilityScopeValue,
    visibleOrgUnitRefs: parseStringArray(process.visibleOrgUnitRefs),
    visibleRoleRefs: parseStringArray(process.visibleRoleRefs),
    visibleUserRefs: parseStringArray(process.visibleUserRefs),
    visibleTargetGroupRefs: parseStringArray(process.visibleTargetGroupRefs),
  };

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Prozesse"
        title="Prozess bearbeiten"
        description={`Bearbeite: ${process.title}`}
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Prozesse", href: "/vereinsleitung/prozesse" },
          { label: process.title, href: `/vereinsleitung/prozesse/${slug}` },
          { label: "Bearbeiten" },
        ]}
      >
        <ClubDevelopmentFormWorkflowShell>
          <ProcessForm mode="edit" processId={process.id} defaultValues={defaultValues} />
        </ClubDevelopmentFormWorkflowShell>
      </FormPagePattern>
    </PageShell>
  );
}
