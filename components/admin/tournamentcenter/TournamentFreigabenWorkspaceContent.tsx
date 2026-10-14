import TournamentApprovalDecisionForm from "@/components/admin/tournamentcenter/TournamentApprovalDecisionForm";
import { resolveTournamentGovernanceStatusLabel } from "@/lib/tournaments/tournament-governance-status-labels";
import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import {
  tournamentFreigabenMayShowDecisionForm,
  type TournamentFreigabenAccess,
} from "@/lib/tournaments/governance/resolve-tournament-freigaben-access";
import { EmptyState } from "@/components/ui/page/EmptyState";
import { resolveTournamentComposerTitleForResume } from "@/lib/tournaments/composer/tournament-composer-draft-access";

export type TournamentFreigabenPendingItem = {
  id: string;
  creatorPersonId: string;
  lifecycleState: string;
  submittedAt: Date | null;
  revisionNumber: number;
  payloadSnapshot: TournamentComposerDraftPayload;
};

type Props = {
  access: Extract<TournamentFreigabenAccess, { kind: "authorized" }>;
  pending: readonly TournamentFreigabenPendingItem[];
  creatorNameById: ReadonlyMap<string, string>;
};

export default function TournamentFreigabenWorkspaceContent({ access, pending, creatorNameById }: Props) {
  if (pending.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]" data-testid="tournament-freigaben-empty">
        <EmptyState
          heading="Keine ausstehenden Turniereinreichungen"
          description="Sobald Turniere zur Freigabe eingereicht werden, erscheinen sie hier."
        />
      </div>
    );
  }

  return (
    <ul className="space-y-3" data-testid="tournament-freigaben-workspace">
      {pending.map((revision) => {
        const payload = revision.payloadSnapshot;
        const showDecisionForm = tournamentFreigabenMayShowDecisionForm({
          access,
          creatorPersonId: revision.creatorPersonId,
        });

        return (
          <li
            key={revision.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
            data-testid={`tournament-approval-item-${revision.id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">Turnier</p>
                <p className="font-medium">
                  {resolveTournamentComposerTitleForResume(payload.title)}
                </p>
              </div>
              <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--text-2)]">
                {resolveTournamentGovernanceStatusLabel(revision.lifecycleState)}
              </span>
            </div>
            <dl className="mt-2 space-y-1 text-xs text-[var(--text-2)]">
              {payload.startAt ? (
                <div className="flex gap-2">
                  <dt className="text-[var(--muted)]">Termin</dt>
                  <dd>{payload.startAt}</dd>
                </div>
              ) : null}
              {payload.homeAway === "AWAY" && payload.location ? (
                <div className="flex gap-2">
                  <dt className="text-[var(--muted)]">Ort (Auswärts)</dt>
                  <dd>{payload.location}</dd>
                </div>
              ) : null}
              <div className="flex gap-2">
                <dt className="text-[var(--muted)]">Ersteller</dt>
                <dd>{creatorNameById.get(revision.creatorPersonId) ?? revision.creatorPersonId}</dd>
              </div>
            </dl>
            {showDecisionForm ? <TournamentApprovalDecisionForm revisionId={revision.id} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
