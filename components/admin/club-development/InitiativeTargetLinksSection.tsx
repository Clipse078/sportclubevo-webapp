"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState, useTransition, type FormEventHandler } from "react";

type TargetLinkRow = {
  id: string;
  targetId: string;
  target: { id: string; title: string; status: string };
};

type Props = {
  initiativeId: string;
  canManage: boolean;
};

export default function InitiativeTargetLinksSection({ initiativeId, canManage }: Props) {
  const [links, setLinks] = useState<TargetLinkRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadLinks = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/club-development/initiatives/${initiativeId}/target-links`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Zielverknüpfungen konnten nicht geladen werden.");
        return;
      }
      setLinks((data.links ?? []) as TargetLinkRow[]);
    });
  }, [initiativeId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const onLink: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!canManage) return;
    const formData = new FormData(event.currentTarget);
    const targetId = String(formData.get("targetId") ?? "").trim();
    if (!targetId) return;
    startTransition(async () => {
      const res = await fetch(`/api/club-development/initiatives/${initiativeId}/target-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Verknüpfung fehlgeschlagen.");
        return;
      }
      event.currentTarget.reset();
      loadLinks();
    });
  };

  const unlink = (targetId: string) => {
    if (!canManage) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/club-development/initiatives/${initiativeId}/target-links?targetId=${encodeURIComponent(targetId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Entfernen fehlgeschlagen.");
        return;
      }
      setLinks((prev) => prev.filter((l) => l.targetId !== targetId));
    });
  };

  return (
    <div className="space-y-3" data-testid="initiative-target-links-section">
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}

      {links.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Keine strategischen Ziele verknüpft.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2"
            >
              <Link
                href={`/vereinsleitung/targets/${link.target.id}`}
                className="text-sm font-medium text-[var(--sce-primary)] hover:underline"
              >
                {link.target.title}
              </Link>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => unlink(link.targetId)}
                  disabled={pending}
                  className="text-xs text-[var(--muted)] hover:text-red-500"
                >
                  Entfernen
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <form onSubmit={onLink} className="flex flex-wrap items-end gap-2">
          <label className="min-w-[12rem] flex-1">
            <span className="mb-1 block text-xs text-[var(--muted)]">Ziel-ID verknüpfen</span>
            <input
              name="targetId"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              placeholder="target-…"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Verknüpfen
          </button>
        </form>
      ) : null}
    </div>
  );
}
