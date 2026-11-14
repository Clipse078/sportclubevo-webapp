"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import ClubDevelopmentTaskSearchPicker from "./ClubDevelopmentTaskSearchPicker";

type PrimaryTaskRow = {
  id: string;
  title: string;
  statusLabel: string;
  assigneeLabels: string[];
  href: string;
  contextLabel: string | null;
};

type Props = {
  initiativeId: string;
  canManage: boolean;
};

export default function InitiativePrimaryTasksSection({ initiativeId, canManage }: Props) {
  const [rows, setRows] = useState<PrimaryTaskRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadRows = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/club-development/initiatives/${initiativeId}/primary-tasks`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Verknüpfte Aufgaben konnten nicht geladen werden.");
        return;
      }
      setRows((data.tasks ?? []) as PrimaryTaskRow[]);
    });
  }, [initiativeId]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const excludeIds = useMemo(() => rows.map((r) => r.id), [rows]);

  const linkTask = (taskId: string) => {
    if (!canManage) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/club-development/initiatives/${initiativeId}/primary-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Verknüpfung fehlgeschlagen.");
        return;
      }
      setMessage("Aufgabe verknüpft — ursprünglicher Aufgabenkontext bleibt erhalten.");
      loadRows();
    });
  };

  const unlink = (taskId: string) => {
    if (!canManage) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/club-development/initiatives/${initiativeId}/primary-tasks?taskId=${encodeURIComponent(taskId)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Entfernen fehlgeschlagen.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== taskId));
    });
  };

  return (
    <div className="space-y-3" data-testid="initiative-primary-tasks-section">
      <p className="text-xs text-[var(--muted)]">
        Bestehende Aufgaben (z. B. aus Sitzungen oder Spielbetrieb) können optional diesem Vorhaben zugeordnet
        werden, ohne deren ursprünglichen Kontext zu ändern.
      </p>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-xs text-[var(--sce-success)]">{message}</p> : null}

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Noch keine optional verknüpften Aufgaben.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2"
            >
              <div className="min-w-0">
                <Link href={row.href} className="text-sm font-medium text-[var(--sce-primary)] hover:underline">
                  {row.title}
                </Link>
                <p className="text-xs text-[var(--muted)]">
                  {row.statusLabel}
                  {row.assigneeLabels.length > 0 ? ` · ${row.assigneeLabels.join(", ")}` : ""}
                  {row.contextLabel ? ` · Kontext: ${row.contextLabel}` : ""}
                </p>
              </div>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => unlink(row.id)}
                  disabled={pending}
                  className="text-xs text-[var(--muted)] hover:text-red-500"
                >
                  Verknüpfung lösen
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="flex flex-wrap items-start gap-2 border-t border-[var(--border)] pt-3">
          <ClubDevelopmentTaskSearchPicker
            excludeTaskIds={excludeIds}
            disabled={pending}
            onSelect={(task) => linkTask(task.id)}
          />
          {pending ? <Loader2 className="mt-2 h-4 w-4 animate-spin text-[var(--muted)]" /> : null}
        </div>
      ) : null}
    </div>
  );
}