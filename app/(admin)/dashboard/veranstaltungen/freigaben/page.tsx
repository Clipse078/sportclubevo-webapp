import Link from "next/link";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import ClubEventFreigabenUnauthorizedState from "@/components/admin/veranstaltungen/ClubEventFreigabenUnauthorizedState";
import ClubEventFreigabenWorkspaceContent from "@/components/admin/veranstaltungen/ClubEventFreigabenWorkspaceContent";
import TrainingFreigabenWorkspaceContent from "@/components/admin/training/TrainingFreigabenWorkspaceContent";
import MatchFreigabenWorkspaceContent from "@/components/admin/matchcenter/MatchFreigabenWorkspaceContent";
import TournamentFreigabenWorkspaceContent from "@/components/admin/tournamentcenter/TournamentFreigabenWorkspaceContent";
import type { ClubEventComposerDraftPayload } from "@/lib/club-events/composer/club-event-composer-draft-types";
import type { TrainingComposerDraftPayload } from "@/lib/training/composer/training-composer-draft-types";
import type { MatchComposerDraftPayload } from "@/lib/matchcenter/composer/match-composer-draft-types";
import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import { loadClubEventFreigabenAccess } from "@/lib/club-events/governance/load-club-event-freigaben-access";
import { loadTrainingFreigabenAccess } from "@/lib/training/governance/load-training-freigaben-access";
import { loadMatchFreigabenAccess } from "@/lib/matchcenter/governance/load-match-freigaben-access";
import { loadTournamentFreigabenAccess } from "@/lib/tournaments/governance/load-tournament-freigaben-access";

export default async function VeranstaltungenFreigabenPage() {
  const session = await requireAnyPermission([
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.TRAININGS_VIEW,
    PERMISSIONS.TRAININGS_MANAGE,
  ]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const [clubAccess, trainingAccess, matchAccess, tournamentAccess] = await Promise.all([
    loadClubEventFreigabenAccess({ session, tenantId: tenant.id }),
    loadTrainingFreigabenAccess({ session, tenantId: tenant.id }),
    loadMatchFreigabenAccess({ session, tenantId: tenant.id }),
    loadTournamentFreigabenAccess({ session, tenantId: tenant.id }),
  ]);

  let clubWorkspace = null;
  if (clubAccess.kind === "authorized") {
    const pending = await prisma.sceActivityGovernanceRevision.findMany({
      where: {
        tenantId: tenant.id,
        activityType: "CLUB_EVENT",
        lifecycleState: "PENDING_APPROVAL",
        isCurrentSubmission: true,
      },
      orderBy: { submittedAt: "desc" },
      take: 50,
      include: { clubEventDraft: true },
    });

    const creatorIds = [...new Set(pending.map((r) => r.creatorPersonId))];
    const creators = creatorIds.length
      ? await prisma.person.findMany({
          where: { id: { in: creatorIds }, tenantId: tenant.id },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const creatorNameById = new Map(
      creators.map((p) => [p.id, `${p.firstName} ${p.lastName}`.trim()]),
    );

    clubWorkspace = (
      <ClubEventFreigabenWorkspaceContent
        access={clubAccess}
        pending={pending.map((revision) => ({
          id: revision.id,
          creatorPersonId: revision.creatorPersonId,
          lifecycleState: revision.lifecycleState,
          submittedAt: revision.submittedAt,
          revisionNumber: revision.revisionNumber,
          payloadSnapshot: revision.payloadSnapshot as ClubEventComposerDraftPayload,
        }))}
        creatorNameById={creatorNameById}
      />
    );
  }

  let trainingWorkspace = null;
  if (trainingAccess.kind === "authorized") {
    const pending = await prisma.sceActivityGovernanceRevision.findMany({
      where: {
        tenantId: tenant.id,
        activityType: "TRAINING",
        lifecycleState: "PENDING_APPROVAL",
        isCurrentSubmission: true,
      },
      orderBy: { submittedAt: "desc" },
      take: 50,
      include: { trainingDraft: true },
    });

    const creatorIds = [...new Set(pending.map((r) => r.creatorPersonId))];
    const creators = creatorIds.length
      ? await prisma.person.findMany({
          where: { id: { in: creatorIds }, tenantId: tenant.id },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const creatorNameById = new Map(
      creators.map((p) => [p.id, `${p.firstName} ${p.lastName}`.trim()]),
    );

    trainingWorkspace = (
      <TrainingFreigabenWorkspaceContent
        access={trainingAccess}
        pending={pending.map((revision) => ({
          id: revision.id,
          creatorPersonId: revision.creatorPersonId,
          lifecycleState: revision.lifecycleState,
          submittedAt: revision.submittedAt,
          revisionNumber: revision.revisionNumber,
          payloadSnapshot: revision.payloadSnapshot as TrainingComposerDraftPayload,
        }))}
        creatorNameById={creatorNameById}
      />
    );
  }

  let matchWorkspace = null;
  if (matchAccess.kind === "authorized") {
    const pending = await prisma.sceActivityGovernanceRevision.findMany({
      where: {
        tenantId: tenant.id,
        activityType: "MATCH",
        lifecycleState: "PENDING_APPROVAL",
        isCurrentSubmission: true,
      },
      orderBy: { submittedAt: "desc" },
      take: 50,
      include: { matchDraft: true },
    });

    const creatorIds = [...new Set(pending.map((r) => r.creatorPersonId))];
    const creators = creatorIds.length
      ? await prisma.person.findMany({
          where: { id: { in: creatorIds }, tenantId: tenant.id },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const creatorNameById = new Map(
      creators.map((p) => [p.id, `${p.firstName} ${p.lastName}`.trim()]),
    );

    matchWorkspace = (
      <MatchFreigabenWorkspaceContent
        access={matchAccess}
        pending={pending.map((revision) => ({
          id: revision.id,
          creatorPersonId: revision.creatorPersonId,
          lifecycleState: revision.lifecycleState,
          submittedAt: revision.submittedAt,
          revisionNumber: revision.revisionNumber,
          payloadSnapshot: revision.payloadSnapshot as MatchComposerDraftPayload,
        }))}
        creatorNameById={creatorNameById}
      />
    );
  }

  let tournamentWorkspace = null;
  if (tournamentAccess.kind === "authorized") {
    const pending = await prisma.sceActivityGovernanceRevision.findMany({
      where: {
        tenantId: tenant.id,
        activityType: "TOURNAMENT",
        lifecycleState: "PENDING_APPROVAL",
        isCurrentSubmission: true,
      },
      orderBy: { submittedAt: "desc" },
      take: 50,
      include: { tournamentDraft: true },
    });

    const creatorIds = [...new Set(pending.map((r) => r.creatorPersonId))];
    const creators = creatorIds.length
      ? await prisma.person.findMany({
          where: { id: { in: creatorIds }, tenantId: tenant.id },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const creatorNameById = new Map(
      creators.map((p) => [p.id, `${p.firstName} ${p.lastName}`.trim()]),
    );

    tournamentWorkspace = (
      <TournamentFreigabenWorkspaceContent
        access={tournamentAccess}
        pending={pending.map((revision) => ({
          id: revision.id,
          creatorPersonId: revision.creatorPersonId,
          lifecycleState: revision.lifecycleState,
          submittedAt: revision.submittedAt,
          revisionNumber: revision.revisionNumber,
          payloadSnapshot: revision.payloadSnapshot as TournamentComposerDraftPayload,
        }))}
        creatorNameById={creatorNameById}
      />
    );
  }

  const unauthorized =
    clubAccess.kind === "unauthorized" &&
    trainingAccess.kind === "unauthorized" &&
    matchAccess.kind === "unauthorized" &&
    tournamentAccess.kind === "unauthorized";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4" data-testid="veranstaltungen-freigaben-page">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Freigaben</h1>
        <Link href="/dashboard/veranstaltungen" className="fca-button-secondary text-sm">
          Zurück
        </Link>
      </div>

      {unauthorized ? (
        <ClubEventFreigabenUnauthorizedState
          reason={clubAccess.kind === "unauthorized" ? clubAccess.reason : "MISSING_APPROVE_PERMISSION"}
          display={clubAccess.kind === "unauthorized" ? clubAccess.display : "STANDARD"}
        />
      ) : (
        <>
          <section className="space-y-3" data-testid="freigaben-section-club-event">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Veranstaltungen</h2>
            {clubAccess.kind === "authorized" ? (
              clubWorkspace
            ) : (
              <p className="text-sm text-[var(--text-2)]">Keine Berechtigung für Veranstaltungs-Freigaben.</p>
            )}
          </section>
          <section className="space-y-3" data-testid="freigaben-section-training">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Trainings</h2>
            {trainingAccess.kind === "authorized" ? (
              trainingWorkspace
            ) : (
              <p className="text-sm text-[var(--text-2)]">Keine Berechtigung für Trainings-Freigaben.</p>
            )}
          </section>
          <section className="space-y-3" data-testid="freigaben-section-match">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Spiele</h2>
            {matchAccess.kind === "authorized" ? (
              matchWorkspace
            ) : (
              <p className="text-sm text-[var(--text-2)]">Keine Berechtigung für Spiel-Freigaben.</p>
            )}
          </section>
          <section className="space-y-3" data-testid="freigaben-section-tournament">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Turniere</h2>
            {tournamentAccess.kind === "authorized" ? (
              tournamentWorkspace
            ) : (
              <p className="text-sm text-[var(--text-2)]">Keine Berechtigung für Turnier-Freigaben.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
