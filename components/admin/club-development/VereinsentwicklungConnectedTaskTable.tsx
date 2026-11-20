"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { GripVertical, MoreVertical } from "lucide-react";
import {
  VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS,
  type VereinsentwicklungConnectedTaskTableRowModel,
} from "@/lib/club-development/vereinsentwicklung-connected-task-table";
import VereinsentwicklungWorkspaceTaskStatusPill from "./VereinsentwicklungWorkspaceTaskStatusPill";
import { cn } from "@/lib/cn";

function AssigneeCell({
  assignees,
}: {
  assignees: VereinsentwicklungConnectedTaskTableRowModel["assignees"];
}) {
  if (assignees.length === 0) return <span className="text-xs text-[var(--muted)]">—</span>;
  const primary = assignees[0]!;
  const initials = primary.displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {primary.imageUrl ? (
        <img
          src={primary.imageUrl}
          alt=""
          className="h-6 w-6 shrink-0 rounded-full border border-[var(--border)] object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[0.625rem] font-semibold uppercase text-[var(--sce-primary)]"
        >
          {initials || "?"}
        </span>
      )}
      <span className="truncate text-xs text-[var(--text-2)]">{primary.displayName}</span>
    </div>
  );
}

function LinkCell({
  label,
  href,
  columnLabel,
}: {
  label: string | null;
  href: string | null;
  columnLabel: typeof VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.ziel | typeof VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.strategie;
}) {
  if (!label?.trim()) {
    return <span className="text-xs text-[var(--muted)]">—</span>;
  }
  if (!href) return <span className="text-xs text-[var(--text-2)]">{label}</span>;
  return (
    <Link href={href} className="text-xs text-[var(--text-2)] hover:text-[var(--sce-primary)]">
      <span className="sr-only">{columnLabel}: </span>
      {label}
    </Link>
  );
}

export type VereinsentwicklungConnectedTaskTableProps = {
  rows: VereinsentwicklungConnectedTaskTableRowModel[];
  showReorderHandle?: boolean;
  renderRowActions?: (row: VereinsentwicklungConnectedTaskTableRowModel) => ReactNode;
  footer?: ReactNode;
  testId?: string;
};

export default function VereinsentwicklungConnectedTaskTable({
  rows,
  showReorderHandle = false,
  renderRowActions,
  footer,
  testId,
}: VereinsentwicklungConnectedTaskTableProps) {
  const gridCols = showReorderHandle
    ? "sm:grid-cols-[auto_minmax(0,1.35fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,0.75fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto]"
    : "sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,0.75fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto]";

  return (
    <div className="space-y-0" data-testid={testId}>
      <div
        className={cn(
          "hidden gap-3 border-b border-[var(--border)]/60 pb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)] sm:grid",
          gridCols,
        )}
        data-testid="vereinsentwicklung-task-table-header"
      >
        {showReorderHandle ? <span className="w-5" /> : null}
        <span>{VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.aufgabe}</span>
        <span>{VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.ziel}</span>
        <span>{VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.strategie}</span>
        <span>{VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.orgEinheit}</span>
        <span>{VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.status}</span>
        <span>{VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.verantwortlich}</span>
        <span className="w-8" aria-hidden />
      </div>

      <ul className="divide-y divide-[var(--border)]/50">
        {rows.map((row) => (
          <li
            key={row.taskId}
            className={cn(
              "grid gap-2 px-1 py-2.5 sm:items-center",
              gridCols,
            )}
            data-testid={`vereinsentwicklung-task-row-${row.taskId}`}
          >
            {showReorderHandle ? (
              <span className="flex items-center text-[var(--muted)]" aria-hidden>
                <GripVertical className="h-4 w-4" />
              </span>
            ) : null}
            <div className="min-w-0">
              <Link
                href={row.taskHref}
                className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--sce-primary)]"
              >
                {row.title}
              </Link>
            </div>
            <LinkCell
              label={row.targetTitle}
              href={row.targetHref}
              columnLabel={VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.ziel}
            />
            <LinkCell
              label={row.strategyTitle}
              href={row.strategyHref}
              columnLabel={VEREINSENTWICKLUNG_CONNECTED_TASK_TABLE_COLUMNS.strategie}
            />
            <span className="text-xs text-[var(--text-2)]">{row.orgUnitLabel?.trim() || "Gesamtverein"}</span>
            <VereinsentwicklungWorkspaceTaskStatusPill status={row.status} label={row.statusLabel} />
            <AssigneeCell assignees={row.assignees} />
            <div className="flex justify-end">
              {renderRowActions ? (
                renderRowActions(row)
              ) : (
                <span className="text-[var(--muted)]" aria-hidden>
                  <MoreVertical className="h-4 w-4" />
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {footer ? <div className="pt-3">{footer}</div> : null}
    </div>
  );
}