"use client";

import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { InitiativeDisposition, InitiativeStatus } from "@prisma/client";
import InitiativeBacklogCreateCard from "./InitiativeBacklogCreateCard";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import { Badge } from "@/components/ui";

export type InitiativeBacklogRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: InitiativeStatus;
  owner: string | null;
  expectedOutcome: string | null;
  backlogPriority: number;
  disposition: InitiativeDisposition;
  dueDate: string | null;
  updatedAt: string;
};

type Props = {
  initialInitiatives: InitiativeBacklogRow[];
  canManage: boolean;
  canView: boolean;
};

const STATUS_LABELS: Record<InitiativeStatus, string> = {
  PLANNED: "Geplant",
  IN_PROGRESS: "In Arbeit",
  ON_TRACK: "On Track",
  ON_HOLD: "Pausiert",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgesagt",
};

const DISPOSITION_LABELS: Record<Exclude<InitiativeDisposition, "NONE">, string> = {
  DEFERRED: "Zurückgestellt",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

function serializeRows(
  rows: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    status: InitiativeStatus;
    owner: string | null;
    expectedOutcome: string | null;
    backlogPriority: number;
    disposition: InitiativeDisposition;
    dueDate: Date | null;
    updatedAt: Date;
  }[],
): InitiativeBacklogRow[] {
  return rows.map((row) => ({
    ...row,
    dueDate: row.dueDate?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

type BacklogResponse = {
  initiatives: Parameters<typeof serializeRows>[0];
  error?: string;
};

export default function InitiativeBacklogWorkspace({
  initialInitiatives,
  canManage,
  canView,
}: Props) {
  const [rows, setRows] = useState<InitiativeBacklogRow[]>(initialInitiatives);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [dispositionFilter, setDispositionFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const skipInitialFetchRef = useRef(true);
  const filtersChangedRef = useRef(false);

  const fetchBacklog = useCallback(() => {
    if (!canView) {
      setError("Du hast keine Berechtigung, den Backlog zu laden.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (dispositionFilter) params.set("disposition", dispositionFilter);
      const result = await clubDevelopmentFetchJson<BacklogResponse>(
        `/api/club-development/initiatives/backlog?${params.toString()}`,
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const initiatives = (result.data.initiatives ?? []) as Parameters<typeof serializeRows>[0];
      setRows(serializeRows(initiatives));
    });
  }, [canView, dispositionFilter, search, statusFilter]);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      filtersChangedRef.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      filtersChangedRef.current = true;
      fetchBacklog();
    }, 300);
    return () => window.clearTimeout(handle);
  }, [fetchBacklog]);

  const filteredRows = useMemo(() => {
    const ownerQ = ownerFilter.trim().toLowerCase();
    if (!ownerQ) return rows;
    return rows.filter((row) => (row.owner ?? "").toLowerCase().includes(ownerQ));
  }, [ownerFilter, rows]);

  const listEmpty = filteredRows.length === 0;
  const showLoadFailureHint = Boolean(error) && rows.length === 0 && !filtersChangedRef.current;

  return (
    <div className="space-y-4" data-testid="initiative-backlog-workspace">
      <InitiativeBacklogCreateCard
        canCreate={canManage}
        onCreated={() => {
          filtersChangedRef.current = true;
          fetchBacklog();
        }}
      />

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative block sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen …"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
            >
              <option value="">Alle</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Disposition</span>
            <select
              value={dispositionFilter}
              onChange={(e) => setDispositionFilter(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
            >
              <option value="">Alle</option>
              {Object.entries(DISPOSITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2 lg:col-span-4">
            <span className="mb-1 block text-xs text-[var(--muted)]">Verantwortlich (Textfilter)</span>
            <input
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
            />
          </label>
        </div>

        {error ? <ClubDevelopmentFormError message={error} className="mb-3" /> : null}

        {pending ? (
          <div className="mb-2 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
          </div>
        ) : null}

        {listEmpty ? (
          <div className="py-8 text-center text-sm text-[var(--muted)]">
            {showLoadFailureHint
              ? "Backlog konnte nicht geladen werden. Bereits sichtbare Einträge bleiben erhalten, sobald vorhanden."
              : canManage
                ? "Keine Initiativen im Backlog. Erfassen Sie die erste Initiative oben."
                : "Keine sichtbaren Initiativen im Backlog."}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {filteredRows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/vereinsleitung/initiativen/${row.slug}`}
                    className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--sce-primary)]"
                  >
                    {row.title}
                  </Link>
                  {row.summary ? (
                    <p className="mt-0.5 text-xs text-[var(--text-2)] line-clamp-2">{row.summary}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Priorität {row.backlogPriority} · {STATUS_LABELS[row.status]}
                    {row.owner ? ` · ${row.owner}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {row.disposition !== "NONE" ? (
                    <Badge variant="secondary" size="sm">
                      {DISPOSITION_LABELS[row.disposition as keyof typeof DISPOSITION_LABELS]}
                    </Badge>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}