"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Edit, Search, Workflow } from "lucide-react";
import { Badge } from "@/components/ui";
import VisibilityScopeBadge from "@/components/admin/shared/VisibilityScopeBadge";
import type { VisibilityScopeValue } from "@/components/admin/shared/VisibilityScopeSelect";
import { meetingApprovalAggregateStatusLabel } from "@/lib/club-development/process-approval-presentation";
import type { ClubDevelopmentProcessStatus, MeetingApprovalAggregateStatus } from "@prisma/client";

export type ProcessListItemShape = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: ClubDevelopmentProcessStatus;
  owner: string | null;
  approvalRequired: boolean;
  approvalStatus: MeetingApprovalAggregateStatus;
  visibilityScope: VisibilityScopeValue;
};

const STATUS_LABELS: Record<ClubDevelopmentProcessStatus, string> = {
  DRAFT: "Entwurf",
  ACTIVE: "Aktiv",
  ARCHIVED: "Archiviert",
};

const STATUS_VARIANTS: Record<ClubDevelopmentProcessStatus, "default" | "success" | "secondary"> = {
  DRAFT: "default",
  ACTIVE: "success",
  ARCHIVED: "secondary",
};

type VereinsleitungProzesseListProps = {
  processes: ProcessListItemShape[];
};

export default function VereinsleitungProzesseList({ processes }: VereinsleitungProzesseListProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return processes.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.summary?.toLowerCase().includes(q) ?? false) ||
        (p.owner?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [processes, query, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Prozesse durchsuchen…"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm"
            data-testid="process-list-search"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          data-testid="process-status-filter"
        >
          <option value="ALL">Alle Status</option>
          <option value="DRAFT">Entwurf</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="ARCHIVED">Archiviert</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Keine Prozesse entsprechen den Filtern.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((process) => (
            <div
              key={process.id}
              className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Workflow className="h-4 w-4 text-[var(--sce-primary)]" />
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">{process.title}</h3>
                    <Badge variant={STATUS_VARIANTS[process.status]} size="sm">
                      {STATUS_LABELS[process.status]}
                    </Badge>
                    <VisibilityScopeBadge scope={process.visibilityScope} />
                    {process.approvalRequired ? (
                      <Badge variant="info" size="sm">
                        {meetingApprovalAggregateStatusLabel(process.approvalStatus)}
                      </Badge>
                    ) : null}
                  </div>
                  {process.summary ? (
                    <p className="text-xs text-[var(--text-2)] leading-relaxed">{process.summary}</p>
                  ) : null}
                  {process.owner ? (
                    <p className="mt-2 text-xs text-[var(--muted)]">Verantwortlich: {process.owner}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/vereinsleitung/prozesse/${process.slug}/edit`}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                    title="Bearbeiten"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={`/vereinsleitung/prozesse/${process.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--sce-primary)]"
                  >
                    Öffnen <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
