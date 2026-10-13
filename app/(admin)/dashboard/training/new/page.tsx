import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { findTeamSeasonsForTenant } from "@/lib/training/queries";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import TrainingCreateForm from "@/components/admin/training/TrainingCreateForm";
import TrainingRecordWorkspaceShell from "@/components/admin/training/record/TrainingRecordWorkspaceShell";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { prisma } from "@/lib/db/prisma";
import { createPlanningAuthorizationPolicy } from "@/lib/planning/planning-authorization-policy";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";
import type { BreadcrumbItem } from "@/components/ui/page";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { loadTrainingEffectiveGovernanceForSession } from "@/lib/training/composer/load-effective-governance-server";
import { getTrainingComposerDraftForCreatorResume } from "@/lib/training/composer/training-composer-draft-access.server";
import type { TrainingComposerDraftPayload } from "@/lib/training/composer/training-composer-draft-types";
import { resolvePersonIdForUser } from "@/lib/sce/activity-governance/persistence/resolve-person-id";
import { auth } from "@/auth";
import { SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY } from "@/lib/sce/activity-governance/types";

type SearchParams = Promise<{ draftId?: string }>;

export default async function NewTrainingSeriesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await requireAnyPermission([
    PERMISSIONS.TRAININGS_MANAGE,
    PERMISSIONS.TRAININGS_VIEW,
  ]);

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const tenantId = tenantContext.id;
  const userId = session.user?.effectiveUserId ?? session.user?.id;
  if (!userId) notFound();

  const policy = createPlanningAuthorizationPolicy(prisma);

  const [teamSeasons, facilities, writableTeamIds, operationalDurationPolicy] = await Promise.all([
    findTeamSeasonsForTenant(tenantId),
    getFacilitiesForTenant(tenantId),
    policy.getWritableTeamIds({ userId, tenantId }, "training"),
    getTenantOperationalDurationPolicy(tenantId),
  ]);

  const defaultTrainingDurationMinutes = operationalDurationPolicy.TRAINING.durationMinutes;

  const writableTeamIdSet = new Set(writableTeamIds);
  const filteredTeamSeasons =
    writableTeamIds.length > 0 ? teamSeasons.filter((ts) => writableTeamIdSet.has(ts.teamId)) : [];

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

  const effectiveGovernance = await loadTrainingEffectiveGovernanceForSession({ tenantId });

  const params = (await searchParams) ?? {};
  const draftId = params.draftId?.trim() || null;
  let reviewerComment: string | null = null;
  let initialResumeDraft: { draftId: string; payload: TrainingComposerDraftPayload } | null = null;

  if (draftId) {
    const authSession = await auth();
    const personId =
      authSession?.user?.id != null
        ? await resolvePersonIdForUser(tenantId, authSession.user.id)
        : null;
    if (!personId) {
      notFound();
    }
    const draft = await getTrainingComposerDraftForCreatorResume({
      tenantId,
      draftId,
      creatorPersonId: personId,
    });
    if (!draft) {
      notFound();
    }
    initialResumeDraft = { draftId: draft.id, payload: draft.payload };
    if (draft.lifecycleState === "CHANGES_REQUESTED") {
      const revision = await prisma.sceActivityGovernanceRevision.findFirst({
        where: {
          tenantId,
          trainingDraftId: draft.id,
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

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Planung", href: "/dashboard/planner" },
    { label: "Trainings", href: "/dashboard/training" },
    { label: initialResumeDraft ? "Entwurf fortsetzen" : "Erstellen" },
  ];

  return (
    <TrainingRecordWorkspaceShell breadcrumbs={breadcrumbs} testId="training-create-page">
      <TrainingCreateForm
        teamSeasons={filteredTeamSeasons.map((ts) => ({
          id: ts.id,
          teamId: ts.teamId,
          teamName: ts.teamName,
          seasonName: ts.seasonName,
          category: ts.category,
          genderGroup: ts.genderGroup,
        }))}
        pitchHallFacilityGroups={pitchHallFacilityGroups}
        dressingRoomFacilityGroups={dressingRoomFacilityGroups}
        timeZone={tenantContext.timezone ?? "Europe/Zurich"}
        defaultTrainingDurationMinutes={defaultTrainingDurationMinutes}
        initialDraftId={draftId}
        initialResumeDraft={initialResumeDraft}
        reviewerComment={reviewerComment}
        effectiveGovernance={
          effectiveGovernance ?? {
            activityType: "TRAINING",
            personId: "anonymous",
            mayCreate: true,
            publicationAuthority: SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY,
            approvalStrategy: "ANY_ONE",
            validatorPersonIds: [],
          }
        }
      />
    </TrainingRecordWorkspaceShell>
  );
}
