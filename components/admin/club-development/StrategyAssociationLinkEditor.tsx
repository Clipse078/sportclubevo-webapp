"use client";

import { useState, type ComponentProps, type Dispatch, type ReactNode, type SetStateAction } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
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
  clubStrategyId?: string | null;
  editing?: boolean;
  compact?: boolean;
  onAssociationsSaved?: (counts: { meetings: number; decisions: number }) => void;
};

export default function StrategyAssociationLinkEditor({
  initialMeetingRefs,
  initialDecisionRefs,
  availableMeetings,
  availableDecisions,
  canManage,
  clubStrategyId = null,
  editing = false,
  compact = false,
  onAssociationsSaved,
}: Props) {
  const [meetingRefs, setMeetingRefs] = useState<EntityRef[]>(initialMeetingRefs);
  const [decisionRefs, setDecisionRefs] = useState<EntityRef[]>(initialDecisionRefs);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chipBase =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition cursor-pointer select-none";
  const chipActive = "border-[var(--sce-primary)] bg-[var(--sce-primary)]/10 text-[var(--sce-primary)]";
  const chipInactive =
    "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-slate-300 hover:bg-[var(--surface-2)]";

  const showReadList = !canManage || !editing;
  const linkCount = meetingRefs.length + decisionRefs.length;

  async function handleSave() {
    if (!canManage) return;
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const res = await fetch("/api/club-development/club-strategy/meeting-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingRefs,
          decisionRefs,
          ...(clubStrategyId ? { clubStrategyId } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Verknüpfungen konnten nicht gespeichert werden.");
        return;
      }
      setSaved(true);
      onAssociationsSaved?.({
        meetings: meetingRefs.length,
        decisions: decisionRefs.length,
      });
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  if (!canManage && linkCount === 0) {
    return null;
  }

  const sectionClass = compact
    ? "space-y-2"
  : "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm";

  return (
    <MotionSection
      className={sectionClass}
      data-testid="strategy-association-links"
      compact={compact}
    >
      <h4 className="text-xs font-semibold text-[var(--foreground)]">
        {CD_STRATEGY_AUTHORING_COPY.meetingLinksHeading}
      </h4>

      {error ? <ClubDevelopmentFormError message={error} /> : null}
      {saved ? (
        <p className="text-xs font-medium text-emerald-700" data-testid="strategy-association-save-success">
          {CD_STRATEGY_AUTHORING_COPY.associationSaveSuccess}
        </p>
      ) : null}

      {showReadList ? (
        linkCount === 0 ? (
          <p className="text-xs text-[var(--muted)]">{CD_STRATEGY_AUTHORING_COPY.associationEmpty}</p>
        ) : (
          <ul className="space-y-1">
            {meetingRefs.map((ref) => (
              <li key={`m-${ref.slug}`}>
                <Link
                  href={ref.url ?? `/vereinsleitung/meetings/${ref.slug}`}
                  className="text-sm text-[var(--sce-primary)] hover:underline"
                >
                  {ref.title}
                </Link>
              </li>
            ))}
            {decisionRefs.map((ref) => (
              <li key={`d-${ref.slug}`}>
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
        )
      ) : (
        <MotionEditAssociations
          availableMeetings={availableMeetings}
          availableDecisions={availableDecisions}
          meetingRefs={meetingRefs}
          decisionRefs={decisionRefs}
          chipBase={chipBase}
          chipActive={chipActive}
          chipInactive={chipInactive}
          setMeetingRefs={setMeetingRefs}
          setDecisionRefs={setDecisionRefs}
          setSaved={setSaved}
          linkCount={linkCount}
          loading={loading}
          handleSave={handleSave}
        />
      )}
    </MotionSection>
  );
}

function MotionSection({
  children,
  className,
  compact,
  ...rest
}: {
  children: ReactNode;
  className: string;
  compact: boolean;
} & ComponentProps<"div">) {
  if (compact) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <section className={className} {...rest}>
      {children}
    </section>
  );
}

function MotionEditAssociations({
  availableMeetings,
  availableDecisions,
  meetingRefs,
  decisionRefs,
  chipBase,
  chipActive,
  chipInactive,
  setMeetingRefs,
  setDecisionRefs,
  setSaved,
  linkCount,
  loading,
  handleSave,
}: {
  availableMeetings: EntityRef[];
  availableDecisions: EntityRef[];
  meetingRefs: EntityRef[];
  decisionRefs: EntityRef[];
  chipBase: string;
  chipActive: string;
  chipInactive: string;
  setMeetingRefs: Dispatch<SetStateAction<EntityRef[]>>;
  setDecisionRefs: Dispatch<SetStateAction<EntityRef[]>>;
  setSaved: (v: boolean) => void;
  linkCount: number;
  loading: boolean;
  handleSave: () => void;
}) {
  return (
    <div className="space-y-3">
      <AssociationChipGroup
        title="Sitzungen"
        options={availableMeetings}
        refs={meetingRefs}
        chipBase={chipBase}
        chipActive={chipActive}
        chipInactive={chipInactive}
        onToggle={(option) => {
          setSaved(false);
          setMeetingRefs((prev) => toggleEntityRef(prev, option));
        }}
      />
      <AssociationChipGroup
        title="Beschlüsse"
        options={availableDecisions}
        refs={decisionRefs}
        chipBase={chipBase}
        chipActive={chipActive}
        chipInactive={chipInactive}
        onToggle={(option) => {
          setSaved(false);
          setDecisionRefs((prev) => toggleEntityRef(prev, option));
        }}
      />
      <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2">
        <p className="text-[11px] text-[var(--muted)]">
          {linkCount} Verknüpfung{linkCount !== 1 ? "en" : ""}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface)] disabled:opacity-60"
          data-testid="strategy-association-save"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {CD_STRATEGY_AUTHORING_COPY.associationSaveAction}
        </button>
      </div>
    </div>
  );
}

function AssociationChipGroup({
  title,
  options,
  refs,
  chipBase,
  chipActive,
  chipInactive,
  onToggle,
}: {
  title: string;
  options: EntityRef[];
  refs: EntityRef[];
  chipBase: string;
  chipActive: string;
  chipInactive: string;
  onToggle: (option: EntityRef) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{title}</p>
      {options.length === 0 ? (
        <p className="text-xs text-[var(--muted)] italic">Keine sichtbaren Einträge.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((option) => {
            const active = isLinked(refs, option.slug);
            return (
              <button
                key={option.slug}
                type="button"
                onClick={() => onToggle(option)}
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
  );
}

/** Parse initial refs from DTO for editor props (server → client). */
export function entityRefsFromAuthoring(
  refs: { slug: string; title: string; url: string }[],
): EntityRef[] {
  return parseEntityRefs(refs);
}