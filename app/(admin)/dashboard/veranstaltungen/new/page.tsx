import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { ToastProvider } from "@/components/ui/ToastProvider";
import PlanningEditorShell from "@/components/admin/shared/planning-editor/PlanningEditorShell";
import PlanningEditorHeader from "@/components/admin/shared/planning-editor/PlanningEditorHeader";
import VeranstaltungCreateForm from "@/components/admin/veranstaltungen/VeranstaltungCreateForm";
import { loadClubEventEffectiveGovernanceForSession } from "@/lib/club-events/composer/load-effective-governance-server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getClubEventComposerDraft } from "@/lib/club-events/composer/club-event-draft-persistence";
import { prisma } from "@/lib/db/prisma";

type SearchParams = Promise<{ draftId?: string }>;

export default async function NewVeranstaltungPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requirePermission(PERMISSIONS.EVENTS_MANAGE);
  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const facilities = await getFacilitiesForTenant(tenantContext.id);

  function facilityGroupsForTypes(types: readonly string[]): FacilityGroup[] {
    return facilities
      .filter((f) => f.status !== "ARCHIVED")
      .map((f) => ({
        facilityId: f.id,
        facilityName: f.name,
        facilityType: f.type as string,
        resources: f.resources
          .filter((r) => r.status !== "ARCHIVED" && types.includes(r.type))
          .map((r) => ({
            id: r.id,
            name: r.name,
            code: r.code,
            type: r.type,
            facilityId: f.id,
            facilityName: f.name,
            facilityType: f.type as string,
          })),
      }))
      .filter((fg) => fg.resources.length > 0);
  }

  const pitchHallFacilityGroups = facilityGroupsForTypes(["FULL_PITCH", "HALF_PITCH"]);
  const dressingRoomFacilityGroups = facilityGroupsForTypes(["DRESSING_ROOM"]);
  const otherFacilityGroups = facilityGroupsForTypes(["OTHER"]);

  const t = await getTranslations("Veranstaltungen.editor.create");
  const effectiveGovernance = await loadClubEventEffectiveGovernanceForSession({
    tenantId: tenantContext.id,
  });

  const params = (await searchParams) ?? {};
  const draftId = params.draftId?.trim() || null;
  let reviewerComment: string | null = null;
  if (draftId) {
    const draft = await getClubEventComposerDraft(tenantContext.id, draftId);
    if (draft?.lifecycleState === "CHANGES_REQUESTED") {
      const revision = await prisma.sceActivityGovernanceRevision.findFirst({
        where: {
          tenantId: tenantContext.id,
          clubEventDraftId: draft.id,
          isCurrentSubmission: true,
        },
        include: {
          decisions: {
            where: { decision: "REQUEST_CHANGES" },
            orderBy: { decidedAt: "desc" },
            take: 1,
          },
        },
      });
      reviewerComment = revision?.decisions[0]?.comment?.trim() ?? null;
    }
  }

  return (
    <ToastProvider>
      <PlanningEditorShell testId="veranstaltung-create-page">
        <PlanningEditorHeader
          backHref="/dashboard/veranstaltungen"
          backLabel={t("backNav")}
          title={t("title")}
          scheduleContext={t("description")}
          backLinkTestId="veranstaltung-create-back-link"
          testId="veranstaltung-create-header"
        />
        <p className="text-xs leading-snug text-[var(--text-2)]" data-testid="veranstaltung-create-intro">
          {t("intro")}
        </p>
        <VeranstaltungCreateForm
          pitchHallFacilityGroups={pitchHallFacilityGroups}
          dressingRoomFacilityGroups={dressingRoomFacilityGroups}
          otherFacilityGroups={otherFacilityGroups}
          timeZone={tenantContext.timezone ?? "Europe/Zurich"}
          initialDraftId={draftId}
          reviewerComment={reviewerComment}
          effectiveGovernance={
            effectiveGovernance ?? {
              activityType: "CLUB_EVENT",
              personId: "anonymous",
              mayCreate: true,
              publicationAuthority: "DIRECT_PUBLISH",
              approvalStrategy: "ANY_ONE",
              validatorPersonIds: [],
            }
          }
        />
      </PlanningEditorShell>
    </ToastProvider>
  );
}
