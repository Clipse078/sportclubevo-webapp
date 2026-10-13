import TrainingApprovalDecisionForm from "@/components/admin/training/TrainingApprovalDecisionForm";
import { resolveTrainingGovernanceStatusLabel } from "@/lib/training/training-governance-status-labels";
import type { TrainingComposerDraftPayload } from "@/lib/training/composer/training-composer-draft-types";
import {
  trainingFreigabenMayShowDecisionForm,
  type TrainingFreigabenAccess,
} from "@/lib/training/governance/resolve-training-freigaben-access";
import { EmptyState } from "@/components/ui/page/EmptyState";

export type TrainingFreigabenPendingItem = {
  id: string;
  creatorPersonId: string;
  lifecycleState: string;
  submittedAt: Date | null;
  revisionNumber: number;
  payloadSnapshot: TrainingComposerDraftPayload;
};

type Props = {
  access: Extract<TrainingFreigabenAccess, { kind: "authorized" }>;
  pending: readonly TrainingFreigabenPendingItem[];
  creatorNameById: ReadonlyMap<string, string>;
};

export default function TrainingFreigabenWorkspaceContent({
  access,
  pending,
  creatorNameById,
}: Props) {
  if (pending.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]" data-testid="training-freigaben-empty">
        <EmptyState
          heading="Keine ausstehenden Trainingseinreichungen"
          description="Sobald Trainings zur Freigabe eingereicht werden, erscheinen sie hier."
        />
      </div>
    );
  }

  return (
    <ul className="space-y-3" data-testid="training-freigaben-workspace">
      {pending.map((revision) => {
        const payload = revision.payloadSnapshot;
        const scheduleLine = payload.validFrom
          ? `${payload.validFrom}${payload.weekdaySchedules[0] ? ` · ${payload.weekdaySchedules[0].startsAt}` : ""}`
          : null;
        const showDecisionForm = trainingFreigabenMayShowDecisionForm({
          access,
          creatorPersonId: revision.creatorPersonId,
        });

        return (
          <li
            key={revision.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
            data-testid={`training-approval-item-${revision.id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">Training</p>
                <p className="font-medium">{payload.title?.trim() || "Training"}</p>
              </div>
              <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--text-2)]">
                {resolveTrainingGovernanceStatusLabel(revision.lifecycleState)}
              </span>
            </div>
            <dl className="mt-2 space-y-1 text-xs text-[var(--text-2)]">
              {scheduleLine ? (
                <div className="flex gap-2">
                  <dt className="text-[var(--muted)]">Termin</dt>
                  <dd>{scheduleLine}</dd>
                </div>
              ) : null}
              <div className="flex gap-2">
                <dt className="text-[var(--muted)]">Ersteller</dt>
                <dd>{creatorNameById.get(revision.creatorPersonId) ?? revision.creatorPersonId}</dd>
              </div>
            </dl>
            {showDecisionForm ? <TrainingApprovalDecisionForm revisionId={revision.id} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
