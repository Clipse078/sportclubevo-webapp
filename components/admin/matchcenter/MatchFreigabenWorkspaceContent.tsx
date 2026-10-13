import MatchApprovalDecisionForm from "@/components/admin/matchcenter/MatchApprovalDecisionForm";
import { resolveMatchGovernanceStatusLabel } from "@/lib/matchcenter/match-governance-status-labels";
import type { MatchComposerDraftPayload } from "@/lib/matchcenter/composer/match-composer-draft-types";
import {
  matchFreigabenMayShowDecisionForm,
  type MatchFreigabenAccess,
} from "@/lib/matchcenter/governance/resolve-match-freigaben-access";
import { EmptyState } from "@/components/ui/page/EmptyState";
import { resolveMatchComposerTitleForResume } from "@/lib/matchcenter/composer/match-composer-draft-access";

export type MatchFreigabenPendingItem = {
  id: string;
  creatorPersonId: string;
  lifecycleState: string;
  submittedAt: Date | null;
  revisionNumber: number;
  payloadSnapshot: MatchComposerDraftPayload;
};

type Props = {
  access: Extract<MatchFreigabenAccess, { kind: "authorized" }>;
  pending: readonly MatchFreigabenPendingItem[];
  creatorNameById: ReadonlyMap<string, string>;
};

export default function MatchFreigabenWorkspaceContent({ access, pending, creatorNameById }: Props) {
  if (pending.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]" data-testid="match-freigaben-empty">
        <EmptyState
          heading="Keine ausstehenden Spieleinreichungen"
          description="Sobald Spiele zur Freigabe eingereicht werden, erscheinen sie hier."
        />
      </div>
    );
  }

  return (
    <ul className="space-y-3" data-testid="match-freigaben-workspace">
      {pending.map((revision) => {
        const payload = revision.payloadSnapshot;
        const opponent =
          payload.opponentName?.trim() || payload.opponentExternalClubName?.trim() || "";
        const showDecisionForm = matchFreigabenMayShowDecisionForm({
          access,
          creatorPersonId: revision.creatorPersonId,
        });

        return (
          <li
            key={revision.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
            data-testid={`match-approval-item-${revision.id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">Spiel</p>
                <p className="font-medium">
                  {resolveMatchComposerTitleForResume(payload.teamDisplayName, opponent)}
                </p>
              </div>
              <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--text-2)]">
                {resolveMatchGovernanceStatusLabel(revision.lifecycleState)}
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
            {showDecisionForm ? <MatchApprovalDecisionForm revisionId={revision.id} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
