"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import ClubDevelopmentTargetSearchPicker from "./ClubDevelopmentTargetSearchPicker";

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

  const linkedTargetIds = useMemo(() => links.map((l) => l.targetId), [links]);

  const linkTarget = (targetId: string) => {
    if (!canManage) return;
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
        <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
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
        <div className="flex flex-wrap items-start gap-2">
          <ClubDevelopmentTargetSearchPicker
            excludeTargetIds={linkedTargetIds}
            disabled={pending}
            onSelect={(target) => linkTarget(target.id)}
          />
          {pending ? <Loader2 className="mt-2 h-4 w-4 animate-spin text-[var(--muted)]" /> : null}
        </div>
      ) : null}
    </div>
  );
}
