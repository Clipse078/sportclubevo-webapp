import MatchCreateForm from "@/components/admin/matchcenter/MatchCreateForm";
import SpieleRecordWorkspaceShell from "@/components/admin/matchcenter/record/SpieleRecordWorkspaceShell";
import { SPIELE_RECORD_WORKSPACE_SURFACE_CLASS } from "@/components/admin/matchcenter/record/spiele-record-layout";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { auth } from "@/auth";
import { loadMatchComposerCreateSurfaceProps } from "@/lib/matchcenter/composer/load-match-composer-create-surface-props.server";
import { loadMatchEffectiveGovernanceForSession } from "@/lib/matchcenter/composer/load-effective-governance-server";
import { getMatchComposerDraftForCreatorResume } from "@/lib/matchcenter/composer/match-composer-draft-access.server";
import { resolvePersonIdForUser } from "@/lib/sce/activity-governance/persistence/resolve-person-id";
import { getTenantClubCrestUrlCached } from "@/lib/server/request-cache";
import { SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY } from "@/lib/sce/activity-governance/types";

type Props = {
  searchParams?: Promise<{ draftId?: string }>;
};

export default async function NewMatchCenterPage({ searchParams }: Props) {
  await requireAnyPermission([PERMISSIONS.EVENTS_MANAGE, PERMISSIONS.EVENTS_VIEW]);

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const authSession = await auth();
  const userId = authSession?.user?.effectiveUserId ?? authSession?.user?.id;
  if (!userId) notFound();

  const tenantClubCrestUrl = await getTenantClubCrestUrlCached(tenantContext.id);

  const [surfaceProps, effectiveGovernance, resolvedParams, personId] = await Promise.all([
    loadMatchComposerCreateSurfaceProps({
      tenantId: tenantContext.id,
      userId,
      tenantClubName: tenantContext.name,
      tenantLogoUrl: tenantClubCrestUrl,
    }),
    loadMatchEffectiveGovernanceForSession({ tenantId: tenantContext.id }),
    searchParams ?? Promise.resolve(undefined),
    resolvePersonIdForUser(tenantContext.id, userId),
  ]);

  const params = resolvedParams ?? {};
  const draftId = params.draftId?.trim() || null;
  let initialResumeDraft = null;
  if (draftId && personId) {
    const personDraft = await getMatchComposerDraftForCreatorResume({
      tenantId: tenantContext.id,
      draftId,
      actorPersonId: personId,
    });
    if (personDraft) {
      initialResumeDraft = { draftId: personDraft.draftId, payload: personDraft.payload };
    }
  }

  const t = await getTranslations("PlanningEditor.match.create");

  const header = (
    <div className="space-y-1 pt-1" data-testid="spiele-match-create-header">
      <p className="text-xs text-[var(--text-2)]">{t("eyebrow")}</p>
      <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{t("title")}</h1>
      <p className="max-w-2xl text-sm text-[var(--text-2)]">{t("description")}</p>
    </div>
  );

  return (
    <SpieleRecordWorkspaceShell
      breadcrumbs={[
        { label: t("backNav"), href: "/dashboard/matchcenter" },
        { label: t("title") },
      ]}
      backLabel={t("backNav")}
      header={header}
      testId="spiele-match-create-workspace"
    >
      <div className={SPIELE_RECORD_WORKSPACE_SURFACE_CLASS}>
        <MatchCreateForm
          activeSeasonId={surfaceProps.activeSeasonId}
          teamOptions={surfaceProps.teamOptions}
          pitchHallFacilityGroups={surfaceProps.pitchHallFacilityGroups}
          dressingRoomFacilityGroups={surfaceProps.dressingRoomFacilityGroups}
          tenantClubName={surfaceProps.tenantClubName}
          tenantLogoUrl={surfaceProps.tenantLogoUrl}
          containerMode="page"
          effectiveGovernance={
            effectiveGovernance ?? {
              activityType: "MATCH",
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
    </SpieleRecordWorkspaceShell>
  );
}
