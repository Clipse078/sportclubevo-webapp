import ClubEventApprovalDecisionForm from "@/components/admin/veranstaltungen/ClubEventApprovalDecisionForm";
import { resolveClubEventGovernanceStatusLabel } from "@/lib/veranstaltungen/club-event-governance-status-labels";
import type { ClubEventComposerDraftPayload } from "@/lib/club-events/composer/club-event-composer-draft-types";
import {
  clubEventFreigabenMayShowDecisionForm,
  type ClubEventFreigabenAccess,
} from "@/lib/club-events/governance/resolve-club-event-freigaben-access";
import { EmptyState } from "@/components/ui/page/EmptyState";

export type ClubEventFreigabenPendingItem = {
  id: string;
  creatorPersonId: string;
  lifecycleState: string;
  submittedAt: Date | null;
  revisionNumber: number;
  payloadSnapshot: ClubEventComposerDraftPayload;
};

type Props = {
  access: Extract<ClubEventFreigabenAccess, { kind: "authorized" }>;
  pending: readonly ClubEventFreigabenPendingItem[];
  creatorNameById: ReadonlyMap<string, string>;
};

export default function ClubEventFreigabenWorkspaceContent({
  access,
  pending,
  creatorNameById,
}: Props) {
  if (pending.length === 0) {
    return (
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)]"
        data-testid="club-event-freigaben-empty"
      >
        <EmptyState
          heading="Keine ausstehenden Einreichungen"
          description="Sobald Veranstaltungen zur Freigabe eingereicht werden, erscheinen sie hier."
        />
      </div>
    );
  }

  return (
    <ul className="space-y-3" data-testid="club-event-freigaben-workspace">
      {pending.map((revision) => {
        const payload = revision.payloadSnapshot;
        const schedule = payload.schedule;
        const scheduleLine = schedule?.startDate
          ? `${schedule.startDate}${schedule.allDay ? " (ganztägig)" : schedule.startTime ? ` · ${schedule.startTime}` : ""}`
          : null;
        const showDecisionForm = clubEventFreigabenMayShowDecisionForm({
          access,
          creatorPersonId: revision.creatorPersonId,
        });

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
            {showDecisionForm ? (
              <ClubEventApprovalDecisionForm revisionId={revision.id} />
            ) : (
              <p
                className="mt-3 text-xs text-[var(--muted)]"
                data-testid="club-event-approval-self-blocked"
              >
                Eigene Einreichungen können hier nicht freigegeben werden.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
