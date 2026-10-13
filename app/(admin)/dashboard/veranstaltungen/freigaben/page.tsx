import Link from "next/link";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import ClubEventApprovalDecisionForm from "@/components/admin/veranstaltungen/ClubEventApprovalDecisionForm";
import { resolveClubEventGovernanceStatusLabel } from "@/lib/veranstaltungen/club-event-governance-status-labels";
import type { ClubEventComposerDraftPayload } from "@/lib/club-events/composer/club-event-composer-draft-types";

export default async function VeranstaltungenFreigabenPage() {
  await requirePermission(PERMISSIONS.ACTIVITIES_CLUB_EVENT_APPROVE);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

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

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Veranstaltungen — Freigaben</h1>
        <Link href="/dashboard/veranstaltungen" className="fca-button-secondary text-sm">
          Zurück
        </Link>
      </div>
      {pending.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Keine ausstehenden Einreichungen.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((revision) => {
            const payload = revision.payloadSnapshot as ClubEventComposerDraftPayload;
            const schedule = payload.schedule;
            const scheduleLine = schedule?.startDate
              ? `${schedule.startDate}${schedule.allDay ? " (ganztägig)" : schedule.startTime ? ` · ${schedule.startTime}` : ""}`
              : null;
            return (
              <li
                key={revision.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
                data-testid={`club-event-approval-item-${revision.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Veranstaltung
                    </p>
                    <p className="font-medium">{payload.title?.trim() || "Veranstaltung"}</p>
                  </div>
                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--text-2)]">
                    {resolveClubEventGovernanceStatusLabel(revision.lifecycleState)}
                  </span>
                </div>
                <dl className="mt-2 space-y-1 text-xs text-[var(--text-2)]">
                  {scheduleLine ? (
                    <div className="flex gap-2">
                      <dt className="text-[var(--muted)]">Termin</dt>
                      <dd>{scheduleLine}</dd>
                    </div>
                  ) : null}
                  {payload.organizerName ? (
                    <div className="flex gap-2">
                      <dt className="text-[var(--muted)]">Organisation</dt>
                      <dd>{payload.organizerName}</dd>
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <dt className="text-[var(--muted)]">Ersteller</dt>
                    <dd>{creatorNameById.get(revision.creatorPersonId) ?? revision.creatorPersonId}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-[var(--muted)]">Eingereicht</dt>
                    <dd>{revision.submittedAt?.toLocaleString("de-CH") ?? "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-[var(--muted)]">Revision</dt>
                    <dd>{revision.revisionNumber}</dd>
                  </div>
                </dl>
                <ClubEventApprovalDecisionForm revisionId={revision.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
