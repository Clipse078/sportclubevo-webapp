"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Link2, Loader2 } from "lucide-react";
import { toggleEntityRef, isLinked, parseEntityRefs } from "@/lib/linking/helpers";
import type { EntityRef } from "@/lib/linking/types";
import { CD_STRATEGY_AUTHORING_COPY } from "@/lib/club-development/product-copy";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";

type Props = {
  initialMeetingRefs: EntityRef[];
  initialDecisionRefs: EntityRef[];
  availableMeetings: EntityRef[];
  availableDecisions: EntityRef[];
  canManage: boolean;
};

export default function StrategyAssociationLinkEditor({
  initialMeetingRefs,
  initialDecisionRefs,
  availableMeetings,
  availableDecisions,
  canManage,
}: Props) {
  const router = useRouter();
  const [meetingRefs, setMeetingRefs] = useState<EntityRef[]>(initialMeetingRefs);
  const [decisionRefs, setDecisionRefs] = useState<EntityRef[]>(initialDecisionRefs);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chipBase =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition cursor-pointer select-none";
  const chipActive = "border-[var(--sce-primary)] bg-[var(--sce-primary)]/10 text-[var(--sce-primary)]";
  const chipInactive =
    "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-slate-300 hover:bg-[var(--surface-2)]";

  async function handleSave() {
    if (!canManage) return;
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const res = await fetch("/api/club-development/club-strategy/meeting-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingRefs, decisionRefs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Verknüpfungen konnten nicht gespeichert werden.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  if (!canManage && meetingRefs.length === 0 && decisionRefs.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
      data-testid="strategy-association-links"
    >
      <div className="mb-4 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-[var(--sce-primary)]" />
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {CD_STRATEGY_AUTHORING_COPY.meetingLinksHeading}
        </h3>
      </div>
      <p className="mb-4 text-xs text-[var(--muted)]">{CD_STRATEGY_AUTHORING_COPY.associationHint}</p>

      {error ? <ClubDevelopmentFormError message={error} /> : null}
      {saved ? (
        <p className="mb-3 text-xs font-medium text-emerald-700">Verknüpfungen gespeichert — ohne Strategiefreigabe.</p>
      ) : null}

      {!canManage ? (
        <div className="space-y-4">
          {meetingRefs.length > 0 ? (
            <ul className="space-y-1.5">
              {meetingRefs.map((ref) => (
                <li key={ref.slug}>
                  <Link href={ref.url ?? `/vereinsleitung/meetings/${ref.slug}`} className="text-sm text-[var(--sce-primary)] hover:underline">
                    {ref.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {decisionRefs.length > 0 ? (
            <ul className="space-y-1.5">
              {decisionRefs.map((ref) => (
                <li key={ref.slug}>
                  {ref.url ? (
                    <Link href={ref.url} className="text-sm text-[var(--sce-primary)] hover:underline">
                      {ref.title}
                    </Link>
                  ) : (
                    <span className="text-sm text-[var(--foreground)]">{ref.title}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">Sitzungen</p>
            {availableMeetings.length === 0 ? (
              <p className="text-xs text-[var(--muted)] italic">Keine sichtbaren Sitzungen.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableMeetings.map((option) => {
                  const active = isLinked(meetingRefs, option.slug);
                  return (
                    <button
                      key={option.slug}
                      type="button"
                      onClick={() => {
                        setSaved(false);
                        setMeetingRefs((prev) => toggleEntityRef(prev, option));
                      }}
                      className={`${chipBase} ${active ? chipActive : chipInactive}`}
                    >
                      {active ? <Check className="h-3 w-3" /> : null}
                      {option.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">Beschlüsse</p>
            {availableDecisions.length === 0 ? (
              <p className="text-xs text-[var(--muted)] italic">Keine sichtbaren Beschlüsse.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableDecisions.map((option) => {
                  const active = isLinked(decisionRefs, option.slug);
                  return (
                    <button
                      key={option.slug}
                      type="button"
                      onClick={() => {
                        setSaved(false);
                        setDecisionRefs((prev) => toggleEntityRef(prev, option));
                      }}
                      className={`${chipBase} ${active ? chipActive : chipInactive}`}
                    >
                      {active ? <Check className="h-3 w-3" /> : null}
                      {option.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
            <p className="text-[11px] text-[var(--muted)]">
              {meetingRefs.length + decisionRefs.length} Verknüpfung
              {meetingRefs.length + decisionRefs.length !== 1 ? "en" : ""} gewählt
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              data-testid="strategy-association-save"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Verknüpfungen speichern
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Parse initial refs from DTO for editor props (server → client). */
export function entityRefsFromAuthoring(
  refs: { slug: string; title: string; url: string }[],
): EntityRef[] {
  return parseEntityRefs(refs);
}