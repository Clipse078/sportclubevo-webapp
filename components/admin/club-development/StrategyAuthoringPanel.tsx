"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEventHandler } from "react";
import type { ClubStrategyAuthoringDto } from "@/lib/club-development/club-strategy-service";
import { CD_STRATEGY_AUTHORING_COPY } from "@/lib/club-development/product-copy";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import ClubDevelopmentTargetSearchPicker from "./ClubDevelopmentTargetSearchPicker";
import StrategyDocumentReferencesSection from "./StrategyDocumentReferencesSection";
import { PeoplePicker, type PersonPickerResult } from "@/components/shared/PeoplePicker";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";

type Props = {
  initial: ClubStrategyAuthoringDto;
  canManage: boolean;
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function StrategyAuthoringPanel({ initial, canManage }: Props) {
  const router = useRouter();
  const [situationText, setSituationText] = useState(initial.situationText ?? "");
  const [alignmentText, setAlignmentText] = useState(initial.alignmentText ?? "");
  const [periodLabel, setPeriodLabel] = useState(initial.periodLabel ?? "");
  const [periodStartsAt, setPeriodStartsAt] = useState(toDateInputValue(initial.periodStartsAt));
  const [periodEndsAt, setPeriodEndsAt] = useState(toDateInputValue(initial.periodEndsAt));
  const [nextReviewAt, setNextReviewAt] = useState(toDateInputValue(initial.nextReviewAt));
  const [responsiblePerson, setResponsiblePerson] = useState<PersonPickerResult | null>(
    initial.responsiblePersonId
      ? {
          id: initial.responsiblePersonId,
          firstName: "",
          lastName: "",
          displayName: initial.responsibleLabel,
          email: null,
          phone: null,
        }
      : null,
  );
  const [focusTargets, setFocusTargets] = useState(initial.focusTargets);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [focusError, setFocusError] = useState<string | null>(null);
  const [pendingSave, startSave] = useTransition();
  const [pendingFocus, startFocus] = useTransition();

  const linkedTargetIds = useMemo(() => focusTargets.map((f) => f.target.id), [focusTargets]);

  const onSave: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!canManage) return;
    setSaveError(null);
    startSave(async () => {
      const result = await clubDevelopmentFetchJson<{ id: string }>("/api/club-development/club-strategy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situationText,
          alignmentText,
          responsiblePersonId: responsiblePerson?.id ?? null,
          periodLabel,
          periodStartsAt: periodStartsAt || null,
          periodEndsAt: periodEndsAt || null,
          nextReviewAt: nextReviewAt || null,
        }),
      });
      if (!result.ok) {
        setSaveError(result.message);
        return;
      }
      router.refresh();
    });
  };

  const addFocusTarget = (target: { id: string; title: string; status: string }) => {
    if (!canManage) return;
    setFocusError(null);
    startFocus(async () => {
      const res = await fetch("/api/club-development/club-strategy/focus-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: target.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFocusError(typeof data.error === "string" ? data.error : "Schwerpunkt konnte nicht verknüpft werden.");
        return;
      }
      setFocusTargets((prev) => [
        ...prev,
        {
          id: `local-${target.id}`,
          sortOrder: prev.length,
          target: { id: target.id, title: target.title, status: target.status },
        },
      ]);
      router.refresh();
    });
  };

  const removeFocusTarget = (targetId: string) => {
    if (!canManage) return;
    setFocusError(null);
    startFocus(async () => {
      const res = await fetch(
        `/api/club-development/club-strategy/focus-targets?targetId=${encodeURIComponent(targetId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFocusError(typeof data.error === "string" ? data.error : "Entfernen fehlgeschlagen.");
        return;
      }
      setFocusTargets((prev) => prev.filter((f) => f.target.id !== targetId));
      router.refresh();
    });
  };

  return (
    <div className="mb-8 space-y-6" data-testid="strategy-authoring-panel">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 space-y-1">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {CD_STRATEGY_AUTHORING_COPY.sectionTitle}
          </h2>
          <p className="text-sm text-[var(--muted)]">{CD_STRATEGY_AUTHORING_COPY.sectionIntro}</p>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {CD_STRATEGY_AUTHORING_COPY.situationLabel}
            </label>
            <textarea
              value={situationText}
              onChange={(e) => setSituationText(e.target.value)}
              readOnly={!canManage}
              rows={3}
              placeholder={CD_STRATEGY_AUTHORING_COPY.situationPlaceholder}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)]"
              data-testid="strategy-situation"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {CD_STRATEGY_AUTHORING_COPY.alignmentLabel}
            </label>
            <textarea
              value={alignmentText}
              onChange={(e) => setAlignmentText(e.target.value)}
              readOnly={!canManage}
              rows={3}
              placeholder={CD_STRATEGY_AUTHORING_COPY.alignmentPlaceholder}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)]"
              data-testid="strategy-alignment"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {CD_STRATEGY_AUTHORING_COPY.responsibleLabel}
              </label>
              {canManage ? (
                <PeoplePicker
                  selected={responsiblePerson}
                  onSelect={setResponsiblePerson}
                  onClearSelected={() => setResponsiblePerson(null)}
                />
              ) : (
                <p className="text-sm text-[var(--text-2)]">
                  {initial.responsibleLabel ?? CD_STRATEGY_AUTHORING_COPY.unassignedResponsible}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {CD_STRATEGY_AUTHORING_COPY.periodLabel}
              </label>
              <input
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                readOnly={!canManage}
                placeholder={CD_STRATEGY_AUTHORING_COPY.periodPlaceholder}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                data-testid="strategy-period-label"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {CD_STRATEGY_AUTHORING_COPY.periodStartLabel}
              </label>
              <input
                type="date"
                value={periodStartsAt}
                onChange={(e) => setPeriodStartsAt(e.target.value)}
                readOnly={!canManage}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {CD_STRATEGY_AUTHORING_COPY.periodEndLabel}
              </label>
              <input
                type="date"
                value={periodEndsAt}
                onChange={(e) => setPeriodEndsAt(e.target.value)}
                readOnly={!canManage}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {CD_STRATEGY_AUTHORING_COPY.nextReviewLabel}
              </label>
              <input
                type="date"
                value={nextReviewAt}
                onChange={(e) => setNextReviewAt(e.target.value)}
                readOnly={!canManage}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                data-testid="strategy-next-review"
              />
            </div>
          </div>

          {saveError ? <ClubDevelopmentFormError message={saveError} /> : null}

          {canManage ? (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pendingSave}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                data-testid="strategy-save"
              >
                {pendingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {CD_STRATEGY_AUTHORING_COPY.saveAction}
              </button>
            </div>
          ) : null}
        </form>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
          {CD_STRATEGY_AUTHORING_COPY.focusHeading}
        </h3>
        <p className="mb-3 text-xs text-[var(--muted)]">{CD_STRATEGY_AUTHORING_COPY.focusHint}</p>
        {focusError ? <ClubDevelopmentFormError message={focusError} /> : null}

        {focusTargets.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{CD_STRATEGY_AUTHORING_COPY.focusEmpty}</p>
        ) : (
          <ul className="mb-3 space-y-2">
            {focusTargets.map((row) => (
              <li
                key={row.target.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2"
              >
                <Link
                  href={`/vereinsleitung/targets/${row.target.id}`}
                  className="text-sm font-medium text-[var(--sce-primary)] hover:underline"
                >
                  {row.target.title}
                </Link>
                {canManage ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--muted)] hover:text-rose-700"
                    disabled={pendingFocus}
                    onClick={() => removeFocusTarget(row.target.id)}
                  >
                    Entfernen
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <ClubDevelopmentTargetSearchPicker
            excludeTargetIds={linkedTargetIds}
            onSelect={addFocusTarget}
            testId="strategy-focus-target-picker"
          />
        ) : null}
      </section>

      {initial.meetingRefs.length > 0 ? (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
            {CD_STRATEGY_AUTHORING_COPY.meetingLinksHeading}
          </h3>
          <ul className="space-y-1.5">
            {initial.meetingRefs.map((ref) => (
              <li key={ref.slug}>
                <Link href={ref.url} className="text-sm text-[var(--sce-primary)] hover:underline">
                  {ref.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <StrategyDocumentReferencesSection
        references={initial.documentReferences}
        canManage={canManage}
      />
    </div>
  );
}