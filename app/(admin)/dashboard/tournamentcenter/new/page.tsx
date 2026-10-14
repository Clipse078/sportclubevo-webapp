import TournamentCreateForm from "@/components/admin/tournamentcenter/TournamentCreateForm";
import TurniereRecordWorkspaceShell from "@/components/admin/tournamentcenter/record/TurniereRecordWorkspaceShell";
import { TURNIERE_RECORD_WORKSPACE_SURFACE_CLASS } from "@/components/admin/tournamentcenter/record/turniere-record-layout";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { notFound } from "next/navigation";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { auth } from "@/auth";
import { loadTournamentComposerCreateSurfaceProps } from "@/lib/tournaments/composer/load-tournament-composer-create-surface-props.server";
import { loadTournamentEffectiveGovernanceForSession } from "@/lib/tournaments/composer/load-effective-governance-server";
import { getTournamentComposerDraftForCreatorResume } from "@/lib/tournaments/composer/tournament-composer-draft-access.server";
import { resolvePersonIdForUser } from "@/lib/sce/activity-governance/persistence/resolve-person-id";
import { getTenantClubCrestUrlCached } from "@/lib/server/request-cache";
import { SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY } from "@/lib/sce/activity-governance/types";
import { hasPermission } from "@/lib/permissions/has-permission";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";

type Props = {
  searchParams?: Promise<{ draftId?: string }>;
};

export default async function NewTournamentCenterPage({ searchParams }: Props) {
  const session = await requireAnyPermission([PERMISSIONS.EVENTS_MANAGE, PERMISSIONS.EVENTS_VIEW]);

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const authSession = await auth();
  const userId = authSession?.user?.effectiveUserId ?? authSession?.user?.id;
  if (!userId) notFound();

  const tenantClubCrestUrl = await getTenantClubCrestUrlCached(tenantContext.id);
  const canManageFacilitiesTimeStandards = hasPermission(session, PERMISSIONS.FACILITIES_MANAGE);

  const [surfaceProps, effectiveGovernance, resolvedParams, personId, operationalDurationPolicy] =
    await Promise.all([
      loadTournamentComposerCreateSurfaceProps({
        tenantId: tenantContext.id,
        userId,
        tenantClubName: tenantContext.name,
        tenantLogoUrl: tenantClubCrestUrl,
      }),
      loadTournamentEffectiveGovernanceForSession({ tenantId: tenantContext.id }),
      searchParams ?? Promise.resolve(undefined),
      resolvePersonIdForUser(tenantContext.id, userId),
      getTenantOperationalDurationPolicy(tenantContext.id),
    ]);

  const params = resolvedParams ?? {};
  const draftId = params.draftId?.trim() || null;
  let initialResumeDraft = null;
  if (draftId && personId) {
    const personDraft = await getTournamentComposerDraftForCreatorResume({
      tenantId: tenantContext.id,
      draftId,
      actorPersonId: personId,
    });
    if (personDraft) {
      initialResumeDraft = { draftId: personDraft.draftId, payload: personDraft.payload };
    }
  }

  const header = (
    <div className="space-y-1 pt-1" data-testid="turniere-tournament-create-header">
      <p className="text-xs text-[var(--text-2)]">Turniercenter</p>
      <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Neues Turnier</h1>
      <p className="max-w-2xl text-sm text-[var(--text-2)]">
        Teilnehmende Teams, Termin, Ressourcen und Publikation im geführten Composer.
      </p>
    </div>
  );

  return (
    <TurniereRecordWorkspaceShell
      breadcrumbs={[
        { label: "Turniere", href: "/dashboard/tournamentcenter" },
        { label: "Neues Turnier" },
      ]}
      header={header}
      testId="turniere-tournament-create-workspace"
    >
      <div className={TURNIERE_RECORD_WORKSPACE_SURFACE_CLASS}>
        <TournamentCreateForm
          activeSeasonId={surfaceProps.activeSeasonId}
          seasonOptions={surfaceProps.seasonOptions}
          teamOptions={surfaceProps.teamOptions}
          pitchHallFacilityGroups={surfaceProps.pitchHallFacilityGroups}
          dressingRoomFacilityGroups={surfaceProps.dressingRoomFacilityGroups}
          defaultTournamentDurationMinutes={operationalDurationPolicy.TOURNAMENT.durationMinutes}
          canManageFacilitiesTimeStandards={canManageFacilitiesTimeStandards}
          tenantClubName={surfaceProps.tenantClubName}
          tenantLogoUrl={surfaceProps.tenantLogoUrl}
          containerMode="page"
          effectiveGovernance={
            effectiveGovernance ?? {
              activityType: "TOURNAMENT",
              personId: "anonymous",
              mayCreate: true,
              publicationAuthority: SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY,
              approvalStrategy: "ANY_ONE",
              validatorPersonIds: [],
            }
          }
          initialDraftId={draftId}
          initialResumeDraft={initialResumeDraft}
        />
      </div>
    </TurniereRecordWorkspaceShell>
  );
}
