"use client";

import Link from "next/link";
import { Loader2, Pencil } from "lucide-react";
import CreateTargetContextualCollapsibleCard from "@/components/admin/targets/CreateTargetContextualCollapsibleCard";
import { CD_TARGET_COPY } from "@/lib/club-development/product-copy";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEventHandler,
  type ReactNode,
} from "react";
import type { ClubStrategyAuthoringDto } from "@/lib/club-development/club-strategy-service";
import {
  formatStrategyDateLabel,
  formatStrategyPeriodSummary,
  hasPersistedClubStrategy,
} from "@/lib/club-development/club-strategy-presentation";
import { CD_STRATEGY_AUTHORING_COPY } from "@/lib/club-development/product-copy";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import ClubDevelopmentTargetSearchPicker from "./ClubDevelopmentTargetSearchPicker";
import StrategyAssociationLinkEditor, {
  entityRefsFromAuthoring,
} from "./StrategyAssociationLinkEditor";
import StrategyDocumentReferencesSection from "./StrategyDocumentReferencesSection";
import { PeoplePicker, type PersonPickerResult } from "@/components/shared/PeoplePicker";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";

type Props = {
  initial: ClubStrategyAuthoringDto;
  canManage: boolean;
  availableMeetings: import("@/lib/linking/types").EntityRef[];
  availableDecisions: import("@/lib/linking/types").EntityRef[];
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function narrativeSnapshot(dto: ClubStrategyAuthoringDto) {
  return {
    situationText: dto.situationText ?? "",
    alignmentText: dto.alignmentText ?? "",
    periodLabel: dto.periodLabel ?? "",
    periodStartsAt: toDateInputValue(dto.periodStartsAt),
    periodEndsAt: toDateInputValue(dto.periodEndsAt),
    nextReviewAt: toDateInputValue(dto.nextReviewAt),
    responsiblePersonId: dto.responsiblePersonId,
  };
}

export default function StrategyAuthoringPanel({
  initial,
  canManage,
  availableMeetings,
  availableDecisions,
}: Props) {
  const router = useRouter();
  const persisted = hasPersistedClubStrategy(initial);
  const [editing, setEditing] = useState(canManage && !persisted);

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
          displayName: initial.responsibleLabel ?? "",
          email: null,
          phone: null,
        }
      : null,
  );
  const [focusTargets, setFocusTargets] = useState(initial.focusTargets);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [focusError, setFocusError] = useState<string | null>(null);
  const [pendingSave, startSave] = useTransition();
  const [pendingFocus, startFocus] = useTransition();
  const [targetCreateExpanded, setTargetCreateExpanded] = useState(false);
  const [focusLinkRetryTargetId, setFocusLinkRetryTargetId] = useState<string | null>(null);

  useEffect(() => {
    setFocusTargets(initial.focusTargets);
    if (!editing) {
      setSituationText(initial.situationText ?? "");
      setAlignmentText(initial.alignmentText ?? "");
      setPeriodLabel(initial.periodLabel ?? "");
      setPeriodStartsAt(toDateInputValue(initial.periodStartsAt));
      setPeriodEndsAt(toDateInputValue(initial.periodEndsAt));
      setNextReviewAt(toDateInputValue(initial.nextReviewAt));
      setResponsiblePerson(
        initial.responsiblePersonId
          ? {
              id: initial.responsiblePersonId,
              firstName: "",
              lastName: "",
              displayName: initial.responsibleLabel ?? "",
              email: null,
              phone: null,
            }
          : null,
      );
    }
  }, [initial, editing]);

  const linkedTargetIds = useMemo(() => focusTargets.map((f) => f.target.id), [focusTargets]);

  const unsavedNarrative = useMemo(() => {
    if (!editing) return false;
    const baseline = narrativeSnapshot(initial);
    return (
      situationText !== baseline.situationText ||
      alignmentText !== baseline.alignmentText ||
      periodLabel !== baseline.periodLabel ||
      periodStartsAt !== baseline.periodStartsAt ||
      periodEndsAt !== baseline.periodEndsAt ||
      nextReviewAt !== baseline.nextReviewAt ||
      (responsiblePerson?.id ?? null) !== baseline.responsiblePersonId
    );
  }, [
    editing,
    initial,
    situationText,
    alignmentText,
    periodLabel,
    periodStartsAt,
    periodEndsAt,
    nextReviewAt,
    responsiblePerson,
  ]);

  const responsibleReadLabel =
    initial.responsibleLabel?.trim() ||
    responsiblePerson?.displayName?.trim() ||
    CD_STRATEGY_AUTHORING_COPY.unassignedResponsible;

  const onSave: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!canManage) return;
    setSaveError(null);
    setSaveSuccess(false);
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
      setSaveSuccess(true);
      setEditing(false);
      router.refresh();
    });
  };

  const addFocusTarget = (target: { id: string; title: string; status: string }) => {
    if (!canManage || !editing) return;
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

  const retryFocusLink = () => {
    if (!focusLinkRetryTargetId) return;
    setFocusError(null);
    startFocus(async () => {
      const res = await fetch("/api/club-development/club-strategy/focus-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: focusLinkRetryTargetId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFocusError(
          typeof data.error === "string" ? data.error : CD_TARGET_COPY.focusLinkRetry,
        );
        return;
      }
      setFocusLinkRetryTargetId(null);
      setFocusTargets((prev) => {
        if (prev.some((f) => f.target.id === focusLinkRetryTargetId)) return prev;
        return [
          ...prev,
          {
            id: `local-${focusLinkRetryTargetId}`,
            sortOrder: prev.length,
            target: {
              id: focusLinkRetryTargetId,
              title: "Ziel",
              status: "DRAFT",
            },
          },
        ];
      });
      router.refresh();
    });
  };

  const removeFocusTarget = (targetId: string) => {
    if (!canManage || !editing) return;
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
    <div className="mb-8 space-y-5" data-testid="strategy-authoring-panel">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {CD_STRATEGY_AUTHORING_COPY.sectionTitle}
          </h2>
          {canManage && persisted ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface)]"
              onClick={() => {
                setSaveSuccess(false);
                setSaveError(null);
                setEditing((v) => !v);
              }}
              data-testid="strategy-edit-toggle"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {editing ? CD_STRATEGY_AUTHORING_COPY.cancelEditAction : CD_STRATEGY_AUTHORING_COPY.editAction}
            </button>
          ) : null}
        </div>

        {editing && canManage ? (
          <form onSubmit={onSave} className="space-y-4" data-testid="strategy-narrative-form">
            <div className="grid gap-3 rounded-lg border border-[var(--border)]/80 bg-[var(--surface-2)]/40 p-3 md:grid-cols-2 xl:grid-cols-4">
              <MotionMetaField label={CD_STRATEGY_AUTHORING_COPY.responsibleLabel}>
                <PeoplePicker
                  selected={responsiblePerson}
                  onSelect={setResponsiblePerson}
                  onClearSelected={() => setResponsiblePerson(null)}
                />
              </MotionMetaField>
              <MotionMetaField label={CD_STRATEGY_AUTHORING_COPY.periodLabel}>
                <input
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  placeholder={CD_STRATEGY_AUTHORING_COPY.periodPlaceholder}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm"
                  data-testid="strategy-period-label"
                />
              </MotionMetaField>
              <MotionMetaField label={`${CD_STRATEGY_AUTHORING_COPY.periodStartLabel} – ${CD_STRATEGY_AUTHORING_COPY.periodEndLabel}`}>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={periodStartsAt}
                    onChange={(e) => setPeriodStartsAt(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
                  />
                  <input
                    type="date"
                    value={periodEndsAt}
                    onChange={(e) => setPeriodEndsAt(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
                  />
                </div>
              </MotionMetaField>
              <MotionMetaField label={CD_STRATEGY_AUTHORING_COPY.nextReviewLabel}>
                <input
                  type="date"
                  value={nextReviewAt}
                  onChange={(e) => setNextReviewAt(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm"
                  data-testid="strategy-next-review"
                />
              </MotionMetaField>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {CD_STRATEGY_AUTHORING_COPY.situationLabel}
              </label>
              <textarea
                value={situationText}
                onChange={(e) => setSituationText(e.target.value)}
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
                rows={3}
                placeholder={CD_STRATEGY_AUTHORING_COPY.alignmentPlaceholder}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)]"
                data-testid="strategy-alignment"
              />
            </div>

            <MotionSaveStatus
              unsaved={unsavedNarrative}
              saveError={saveError}
              saveSuccess={saveSuccess}
              pendingSave={pendingSave}
            />
          </form>
        ) : (
          <div data-testid="strategy-narrative-read">
            <dl className="mb-4 grid gap-2 rounded-lg border border-[var(--border)]/70 bg-[var(--surface-2)]/30 px-3 py-2.5 text-sm md:grid-cols-2 xl:grid-cols-4">
              <MetaReadItem label={CD_STRATEGY_AUTHORING_COPY.responsibleLabel} value={responsibleReadLabel} />
              <MetaReadItem
                label={CD_STRATEGY_AUTHORING_COPY.periodLabel}
                value={formatStrategyPeriodSummary({
                  periodLabel: initial.periodLabel,
                  periodStartsAt: initial.periodStartsAt,
                  periodEndsAt: initial.periodEndsAt,
                })}
              />
              <MetaReadItem
                label={CD_STRATEGY_AUTHORING_COPY.nextReviewLabel}
                value={formatStrategyDateLabel(initial.nextReviewAt)}
              />
            </dl>
            <div className="space-y-3">
              <NarrativeBlock
                label={CD_STRATEGY_AUTHORING_COPY.situationLabel}
                text={initial.situationText}
                empty="Noch keine Ausgangslage erfasst."
              />
              <NarrativeBlock
                label={CD_STRATEGY_AUTHORING_COPY.alignmentLabel}
                text={initial.alignmentText}
                empty="Noch keine Ausrichtung erfasst."
              />
            </div>
          </div>
        )}
      </section>

      <section
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
        data-testid="strategy-focus-section"
      >
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            {CD_STRATEGY_AUTHORING_COPY.focusHeading}
          </h3>
          <p className="text-xs text-[var(--muted)]">{CD_STRATEGY_AUTHORING_COPY.focusHint}</p>
        </div>
        {focusError ? (
          <div className="space-y-1">
            <ClubDevelopmentFormError message={focusError} />
            {focusLinkRetryTargetId ? (
              <button
                type="button"
                className="text-xs font-medium text-[var(--sce-primary)] underline"
                onClick={retryFocusLink}
                disabled={pendingFocus}
              >
                {CD_TARGET_COPY.focusLinkRetry}
              </button>
            ) : null}
          </div>
        ) : null}

        {focusTargets.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{CD_STRATEGY_AUTHORING_COPY.focusEmpty}</p>
        ) : (
          <ul className="mb-3 space-y-2">
            {focusTargets.map((row) => (
              <li
                key={row.target.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2.5"
              >
                <Link
                  href={`/vereinsleitung/targets/${row.target.id}`}
                  className="text-sm font-medium text-[var(--sce-primary)] hover:underline"
                >
                  {row.target.title}
                </Link>
                {canManage && editing ? (
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

        {canManage && editing ? (
          <div className="space-y-3">
            <CreateTargetContextualCollapsibleCard
              expanded={targetCreateExpanded}
              onExpandedChange={setTargetCreateExpanded}
              contextualFocus={{
                onFinished: ({ targetId, title, linkOk, linkError }) => {
                  if (linkOk && targetId) {
                    setFocusError(null);
                    setFocusLinkRetryTargetId(null);
                    setFocusTargets((prev) => [
                      ...prev,
                      {
                        id: `local-${targetId}`,
                        sortOrder: prev.length,
                        target: {
                          id: targetId,
                          title: title ?? "Ziel",
                          status: "DRAFT",
                        },
                      },
                    ]);
                    router.refresh();
                    return;
                  }
                  if (targetId) {
                    setFocusLinkRetryTargetId(targetId);
                  }
                  setFocusError(linkError ?? CD_TARGET_COPY.targetCreatedFocusLinkFailed);
                },
              }}
            />
            <div className="flex flex-wrap items-start gap-2">
              <ClubDevelopmentTargetSearchPicker
                excludeTargetIds={linkedTargetIds}
                onSelect={addFocusTarget}
                testId="strategy-focus-target-picker"
              />
            </div>
          </div>
        ) : null}
      </section>

      <section
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
        data-testid="strategy-supporting-section"
      >
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          {CD_STRATEGY_AUTHORING_COPY.supportingHeading}
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <StrategyAssociationLinkEditor
            key={`assoc-${initial.contentRevision}-${initial.meetingRefs.length}-${initial.decisionRefs.length}`}
            initialMeetingRefs={entityRefsFromAuthoring(initial.meetingRefs)}
            initialDecisionRefs={entityRefsFromAuthoring(initial.decisionRefs)}
            availableMeetings={availableMeetings}
            availableDecisions={availableDecisions}
            canManage={canManage}
            editing={editing && canManage}
            compact
          />
          <StrategyDocumentReferencesSection
            key={`docs-${initial.contentRevision}-${initial.documentReferences.length}`}
            references={initial.documentReferences}
            canManage={canManage}
            editing={editing && canManage}
            compact
          />
        </div>
      </section>
    </div>
  );
}

function MotionMetaField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      {children}
    </div>
  );
}

function MetaReadItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="text-sm text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function NarrativeBlock({ label, text, empty }: { label: string; text: string | null; empty: string }) {
  const content = text?.trim();
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{content || empty}</p>
    </div>
  );
}

function MotionSaveStatus({
  unsaved,
  saveError,
  saveSuccess,
  pendingSave,
}: {
  unsaved: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  pendingSave: boolean;
}) {
  return (
    <div className="space-y-2">
      {unsaved ? (
        <p className="text-xs font-medium text-amber-800" data-testid="strategy-unsaved">
          {CD_STRATEGY_AUTHORING_COPY.unsavedNotice}
        </p>
      ) : null}
      {saveSuccess ? (
        <p className="text-xs font-medium text-emerald-700" data-testid="strategy-save-success">
          {CD_STRATEGY_AUTHORING_COPY.saveSuccess}
        </p>
      ) : null}
      {saveError ? <ClubDevelopmentFormError message={saveError} /> : null}
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
    </div>
  );
}
