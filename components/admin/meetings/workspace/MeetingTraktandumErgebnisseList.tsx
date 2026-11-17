"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  buildAgendaItemErgebnisseDisplayNodes,
  type AgendaErgebnisRow,
} from "@/lib/meetings/agenda-item-ergebnisse";
import { MeetingOutcomeMoreActionsMenu } from "@/components/admin/meetings/workspace/MeetingOutcomeMoreActionsMenu";

const KIND_LABEL: Record<AgendaErgebnisRow["kind"], string> = {
  BESCHLUSS: "Beschluss",
  PENDENZ: "Pendenz",
  AUFGABE: "Aufgabe",
};

type Props = {
  rows: AgendaErgebnisRow[];
  testIdPrefix: string;
  meetingId?: string;
  canManage?: boolean;
  onDecisionRemoved?: () => void | Promise<void>;
  onActionRemoved?: () => void | Promise<void>;
};

function ErgebnisRowContent({
  row,
  testIdPrefix,
  nested,
}: {
  row: AgendaErgebnisRow;
  testIdPrefix: string;
  nested?: boolean;
}) {
  return (
    <>
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {KIND_LABEL[row.kind]}
      </span>
      <Link
        href={row.href}
        className="min-w-0 flex-1 font-medium text-[#0b4aa2] hover:underline break-words"
      >
        {row.title}
      </Link>
      <span className="text-xs text-[var(--text-2)]">{row.statusLabel}</span>
      {row.meta ? (
        <span className={`text-xs text-[var(--muted)] ${nested ? "w-full pl-4" : "w-full"}`}>{row.meta}</span>
      ) : null}
    </>
  );
}

export function MeetingTraktandumErgebnisseList({
  rows,
  testIdPrefix,
  meetingId,
  canManage = false,
  onDecisionRemoved,
  onActionRemoved,
}: Props) {
  const nodes = useMemo(() => buildAgendaItemErgebnisseDisplayNodes(rows), [rows]);
  if (nodes.length === 0) return null;

  return (
    <div className="space-y-2" data-testid={`${testIdPrefix}-ergebnisse`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Ergebnisse</p>
      <ul className="space-y-1.5">
        {nodes.map((node) => {
          if (node.type === "row") {
            const row = node.row;
            const menu =
              meetingId && canManage && row.kind !== "AUFGABE" ? (
                <MeetingOutcomeMoreActionsMenu
                  meetingId={meetingId}
                  recordId={row.id}
                  recordTitle={row.title}
                  kind={row.kind === "BESCHLUSS" ? "decision" : "pendenz"}
                  canManage={canManage}
                  onDeleted={row.kind === "BESCHLUSS" ? onDecisionRemoved ?? (() => {}) : onActionRemoved ?? (() => {})}
                  testIdPrefix={testIdPrefix}
                />
              ) : null;
            return (
              <li
                key={`${row.kind}-${row.id}`}
                className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md border border-[var(--border)]/60 bg-[var(--surface-1)] px-2.5 py-2 text-sm"
                data-testid={`${testIdPrefix}-ergebnis-${row.kind}-${row.id}`}
              >
                <ErgebnisRowContent row={row} testIdPrefix={testIdPrefix} />
                {menu}
              </li>
            );
          }

          const { decision, children } = node;
          return (
            <li
              key={`group-${decision.id}`}
              className="space-y-1 rounded-md border border-[var(--border)]/60 bg-[var(--surface-1)] px-2.5 py-2 text-sm"
              data-testid={`${testIdPrefix}-ergebnis-group-${decision.id}`}
            >
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <ErgebnisRowContent row={decision} testIdPrefix={testIdPrefix} />
                {meetingId && canManage ? (
                  <MeetingOutcomeMoreActionsMenu
                    meetingId={meetingId}
                    recordId={decision.id}
                    recordTitle={decision.title}
                    kind="decision"
                    canManage={canManage}
                    onDeleted={onDecisionRemoved ?? (() => {})}
                    testIdPrefix={testIdPrefix}
                  />
                ) : null}
              </div>
              <ul className="space-y-1 border-l-2 border-[var(--border)]/80 pl-3" aria-label="Massnahmen zu diesem Beschluss">
                {children.map((child) => (
                  <li
                    key={`${child.kind}-${child.id}`}
                    className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1"
                    data-testid={`${testIdPrefix}-ergebnis-${child.kind}-${child.id}`}
                  >
                    <ErgebnisRowContent row={child} testIdPrefix={testIdPrefix} nested />
                    {meetingId && canManage && child.kind === "PENDENZ" ? (
                      <MeetingOutcomeMoreActionsMenu
                        meetingId={meetingId}
                        recordId={child.id}
                        recordTitle={child.title}
                        kind="pendenz"
                        canManage={canManage}
                        onDeleted={onActionRemoved ?? (() => {})}
                        testIdPrefix={testIdPrefix}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}