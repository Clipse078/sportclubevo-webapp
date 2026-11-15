"use client";

import Link from "next/link";
import { ExternalLink, Loader2, Link2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import ClubDevelopmentInitiativeSearchPicker from "@/components/admin/club-development/ClubDevelopmentInitiativeSearchPicker";
import CreateInitiativeContextualCollapsibleCard from "@/components/admin/initiatives/CreateInitiativeContextualCollapsibleCard";
import { CD_TARGET_COPY } from "@/lib/club-development/product-copy";
import type { EntityRef } from "@/lib/linking/types";

type InitiativeLinkRow = {
  id: string;
  initiativeId: string;
  initiative: { id: string; slug: string; title: string; status: string };
  legacy?: boolean;
};

type Props = {
  targetId: string;
  targetTitle: string;
  canManage: boolean;
  legacyInitiativeRefs?: EntityRef[];
};

export default function TargetInitiativeLinksSection({
  targetId,
  targetTitle,
  canManage,
  legacyInitiativeRefs = [],
}: Props) {
  const [links, setLinks] = useState<InitiativeLinkRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [legacyUnlinkNotice, setLegacyUnlinkNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [createExpanded, setCreateExpanded] = useState(false);
  const [highlightSlug, setHighlightSlug] = useState<string | null>(null);
  const [linkRetryInitiativeId, setLinkRetryInitiativeId] = useState<string | null>(null);

  const loadLinks = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/club-development/targets/${targetId}/initiative-links`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Vorhaben konnten nicht geladen werden.");
        return;
      }
      const canonical = (data.links ?? []) as InitiativeLinkRow[];
      const canonicalSlugs = new Set(canonical.map((l) => l.initiative.slug));
      const legacyRows: InitiativeLinkRow[] = legacyInitiativeRefs
        .filter((ref) => ref.slug && !canonicalSlugs.has(ref.slug))
        .map((ref) => ({
          id: `legacy-${ref.slug}`,
          initiativeId: ref.slug,
          legacy: true,
          initiative: {
            id: ref.slug,
            slug: ref.slug,
            title: ref.title,
            status: "LEGACY",
          },
        }));
      setLinks([...canonical, ...legacyRows]);
    });
  }, [legacyInitiativeRefs, targetId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const linkedInitiativeIds = useMemo(
    () => links.filter((l) => !l.legacy).map((l) => l.initiativeId),
    [links],
  );

  const unlinkInitiative = (link: InitiativeLinkRow) => {
    if (!canManage || link.legacy) return;
    setLegacyUnlinkNotice(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/club-development/targets/${targetId}/initiative-links?initiativeId=${encodeURIComponent(link.initiativeId)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Entfernen fehlgeschlagen.");
        return;
      }
      const legacyRemains = legacyInitiativeRefs.some((ref) => ref.slug === link.initiative.slug);
      loadLinks();
      if (legacyRemains) {
        setLegacyUnlinkNotice(CD_TARGET_COPY.legacyLinkRemainsAfterUnlink);
      }
    });
  };

  const linkInitiative = (initiativeId: string) => {
    if (!canManage) return;
    setLinkRetryInitiativeId(null);
    setLegacyUnlinkNotice(null);
    startTransition(async () => {
      const res = await fetch(`/api/club-development/targets/${targetId}/initiative-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initiativeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Verknüpfung fehlgeschlagen.");
        return;
      }
      const row = data.link as InitiativeLinkRow | undefined;
      if (row?.initiative?.slug) {
        setHighlightSlug(row.initiative.slug);
      }
      loadLinks();
    });
  };

  const retryPendingLink = () => {
    if (!linkRetryInitiativeId) return;
    linkInitiative(linkRetryInitiativeId);
  };

  const handleContextualCreate = (payload: {
    initiative: { id: string; slug: string; title: string };
    linkOk: boolean;
    linkError?: string;
  }) => {
    if (payload.linkOk) {
      setHighlightSlug(payload.initiative.slug);
      setLinkRetryInitiativeId(null);
      setError(null);
      loadLinks();
      return;
    }
    setLinkRetryInitiativeId(payload.initiative.id);
    setError(
      payload.linkError?.trim() || CD_TARGET_COPY.initiativeCreatedLinkFailed,
    );
  };

  return (
    <section
      className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-2)]/60 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
      data-testid="target-initiative-links-section"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-[var(--muted)]" />
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            {CD_TARGET_COPY.vorhabenSectionHeading}
          </h3>
        </div>
        <p className="text-[11px] text-[var(--muted)]">{CD_TARGET_COPY.vorhabenSectionHint}</p>
      </div>

      {legacyUnlinkNotice ? (
        <p
          className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
          data-testid="target-initiative-legacy-unlink-notice"
        >
          {legacyUnlinkNotice}
        </p>
      ) : null}

      {error ? (
        <p
          className="mb-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900"
          role="alert"
        >
          {error}
          {linkRetryInitiativeId ? (
            <button
              type="button"
              className="ml-2 text-xs font-semibold text-rose-800 underline"
              onClick={retryPendingLink}
              disabled={pending}
            >
              {CD_TARGET_COPY.initiativeLinkRetry}
            </button>
          ) : null}
        </p>
      ) : null}

      {highlightSlug ? (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Vorhaben verknüpft.{" "}
          <Link
            href={`/vereinsleitung/initiativen/${highlightSlug}`}
            className="font-semibold text-emerald-800 underline"
          >
            {CD_TARGET_COPY.openLinkedInitiative}
          </Link>
        </p>
      ) : null}

      {links.length === 0 ? (
        <p className="text-[12px] text-[var(--muted)] italic">{CD_TARGET_COPY.noLinkedInitiatives}</p>
      ) : (
        <ul className="mb-4 space-y-1.5">
          {links.map((link) => (
            <li key={link.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <Link
                  href={`/vereinsleitung/initiativen/${link.initiative.slug}`}
                  className="flex min-w-0 flex-1 items-center gap-2 text-[12px] font-medium text-[var(--foreground)] hover:text-[#0b4aa2]"
                >
                  <span className="min-w-0 flex-1 truncate">{link.initiative.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-[var(--muted)]" />
                </Link>
                {link.legacy ? (
                  <span
                    className="text-[10px] text-[var(--muted)]"
                    data-testid="target-initiative-legacy-badge"
                  >
                    {CD_TARGET_COPY.legacyInitiativeBadge}
                  </span>
                ) : canManage ? (
                  <button
                    type="button"
                    onClick={() => unlinkInitiative(link)}
                    disabled={pending}
                    className="text-[10px] font-medium text-[var(--muted)] hover:text-red-600 disabled:opacity-60"
                    data-testid="target-initiative-unlink"
                  >
                    {CD_TARGET_COPY.unlinkInitiativeAction}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="space-y-3 border-t border-[var(--border)] pt-4">
          <CreateInitiativeContextualCollapsibleCard
            expanded={createExpanded}
            onExpandedChange={setCreateExpanded}
            preselectedTarget={{ id: targetId, title: targetTitle }}
            contextualLink={{
              targetId,
              onFinished: handleContextualCreate,
            }}
          />
          <div className="flex flex-wrap items-start gap-2">
            <p className="w-full text-[11px] font-medium text-[var(--muted)]">
              {CD_TARGET_COPY.linkExistingInitiative}
            </p>
            <ClubDevelopmentInitiativeSearchPicker
              excludeInitiativeIds={linkedInitiativeIds}
              disabled={pending}
              onSelect={(initiative) => linkInitiative(initiative.id)}
              testId="target-initiative-search-picker"
            />
            {pending ? <Loader2 className="mt-2 h-4 w-4 animate-spin text-[var(--muted)]" /> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}