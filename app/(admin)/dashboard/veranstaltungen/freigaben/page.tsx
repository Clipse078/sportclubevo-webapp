import Link from "next/link";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import ClubEventFreigabenUnauthorizedState from "@/components/admin/veranstaltungen/ClubEventFreigabenUnauthorizedState";
import ClubEventFreigabenWorkspaceContent from "@/components/admin/veranstaltungen/ClubEventFreigabenWorkspaceContent";
import type { ClubEventComposerDraftPayload } from "@/lib/club-events/composer/club-event-composer-draft-types";
import { loadClubEventFreigabenAccess } from "@/lib/club-events/governance/load-club-event-freigaben-access";

export default async function VeranstaltungenFreigabenPage() {
  const session = await requireAnyPermission([
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
  ]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const access = await loadClubEventFreigabenAccess({ session, tenantId: tenant.id });

  let workspace = null;
  if (access.kind === "authorized") {
    const pending = await prisma.sceActivityGovernanceRevision.findMany({
      where: {
        tenantId: tenant.id,
        activityType: "CLUB_EVENT",
        lifecycleState: "PENDING_APPROVAL",
        isCurrentSubmission: true,
      },
      orderBy: { submittedAt: "desc" },
      take: 50,
      include: {
        clubEventDraft: true,
      },
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

    workspace = (
      <ClubEventFreigabenWorkspaceContent
        access={access}
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

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4" data-testid="veranstaltungen-freigaben-page">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Veranstaltungen — Freigaben</h1>
        <Link href="/dashboard/veranstaltungen" className="fca-button-secondary text-sm">
          Zurück
        </Link>
      </div>

      {access.kind === "unauthorized" ? (
        <ClubEventFreigabenUnauthorizedState reason={access.reason} />
      ) : (
        workspace
      )}
    </div>
  );
}
