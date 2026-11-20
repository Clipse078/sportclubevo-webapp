"use client";

import Link from "next/link";
import { Loader2, Pencil } from "lucide-react";
import { CD_TARGET_COPY } from "@/lib/club-development/product-copy";
import { useRouter, useSearchParams } from "next/navigation";
import CreateTargetContextualCollapsibleCard from "@/components/admin/targets/CreateTargetContextualCollapsibleCard";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEventHandler,
  type ReactNode,
} from "react";
import type { ClubStrategyDocumentReferenceDto } from "@/lib/club-development/club-strategy-service";
import { strategySupportingMaterialCounts } from "@/lib/club-development/initiative-delivery-progress-presentation";
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
import StrategySupportingMaterialsCard from "./StrategySupportingMaterialsCard";
import SceClubDevelopmentSectionShell from "./SceClubDevelopmentSectionShell";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import TaskDescriptionFormField from "@/components/admin/aufgaben/TaskDescriptionFormField";
import VereinsentwicklungWorkspaceRecordRow from "./VereinsentwicklungWorkspaceRecordRow";
import { SCE_CD_WORKSPACE_PANEL_CLASS } from "./sce-club-development-surface-styles";
import { formatTargetStatusLabel } from "@/lib/targets/target-presentation";
import type { StrategyTargetOverview } from "@/lib/club-development/strategy-overview";
import { PeoplePicker, type PersonPickerResult } from "@/components/shared/PeoplePicker";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import { ClubStrategyScopeType } from "@prisma/client";
import ClubStrategyOrgUnitScopePicker from "./ClubStrategyOrgUnitScopePicker";
import {
  defaultClubStrategyOrgScopeSelection,
  parseClubStrategyOrgScopeSelection,
} from "@/lib/club-development/club-strategy-org-scope";

type Props = {
  initial: ClubStrategyAuthoringDto;
  canManage: boolean;
  targets: StrategyTargetOverview[];
  availableMeetings: import("@/lib/linking/types").EntityRef[];
  availableDecisions: import("@/lib/linking/types").EntityRef[];
  orgUnitOptions: TaskOrgUnitPickerOption[];
};

function initialOrgScopeFromAuthoring(dto: ClubStrategyAuthoringDto): string[] {
  if (dto.scopeOrgUnitIds.length > 0) return [...dto.scopeOrgUnitIds];
  if (dto.scopeType === ClubStrategyScopeType.CLUB) return defaultClubStrategyOrgScopeSelection();
  return [];
}

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
  targets,
  availableMeetings,
  availableDecisions,
  orgUnitOptions,
}: Props) {
  const router = useRouter();
  const persisted = hasPersistedClubStrategy(initial);
  const [editing, setEditing] = useState(canManage && !persisted);

  const strategyId = initial.id;
  const strategyPayloadId = strategyId ? { clubStrategyId: strategyId } : {};
  const [strategyTitle, setStrategyTitle] = useState(
    initial.title?.trim() ||
      (initial.scopeOrgUnitLabels[0] ? `Strategie ${initial.scopeOrgUnitLabels[0]}` : "Strategie"),
  );
  const [orgScope, setOrgScope] = useState<string[]>(() => initialOrgScopeFromAuthoring(initial));
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
  const [focusLinkRetryTargetId, setFocusLinkRetryTargetId] = useState<string | null>(null);
  const [createTargetOpen, setCreateTargetOpen] = useState(false);
  const searchParams = useSearchParams();
  const orgQuery = searchParams.get(CD_WORKSPACE_ORG_UNIT_QUERY);
  const [supportingCounts, setSupportingCounts] = useState(() => strategySupportingMaterialCounts(initial));
  const [documentReferences, setDocumentReferences] = useState(initial.documentReferences);

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
    if (!editing) {
      setSupportingCounts(strategySupportingMaterialCounts(initial));
      setDocumentReferences(initial.documentReferences);
    }
  }, [initial, editing]);

  const handleAssociationsSaved = useCallback(
    (counts: { meetings: number; decisions: number }) => {
      setSupportingCounts((prev) => ({
        ...prev,
        meetings: counts.meetings,
        decisions: counts.decisions,
      }));
    },
    [],
  );

  const handleDocumentReferencesChanged = useCallback(
    (refs: ClubStrategyDocumentReferenceDto[]) => {
      setDocumentReferences(refs);
      const accessible = refs.filter((row) => row.presentation.accessible).length;
      setSupportingCounts((prev) => ({ ...prev, documents: accessible }));
    },
    [],
  );

  const linkedTargetIds = useMemo(() => focusTargets.map((f) => f.target.id), [focusTargets]);

  const focusTargetOverviews = useMemo(() => {
    const byId = new Map(targets.map((row) => [row.id, row]));
    return focusTargets.map((row) => ({
      focus: row,
      overview: byId.get(row.target.id) ?? null,
    }));
  }, [focusTargets, targets]);

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
          ...strategyPayloadId,
          title: strategyTitle,
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
      if (strategyId) {
        const parsedScope = parseClubStrategyOrgScopeSelection(orgScope);
        const patchOrgUnitIds = parsedScope.kind === "org_units" ? parsedScope.orgUnitIds : [];
        if (parsedScope.kind === "invalid") {
          setSaveError("Bitte mindestens eine Org-Einheit oder Gesamtverein wählen.");
          return;
        }
        const orgResult = await clubDevelopmentFetchJson("/api/club-development/club-strategies", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clubStrategyId: strategyId, orgUnitIds: patchOrgUnitIds }),
        });
        if (!orgResult.ok) {
          setSaveError(orgResult.message);
          return;
        }
      }
      setSaveSuccess(true);
      setEditing(false);
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
        body: JSON.stringify({ targetId: target.id, ...strategyPayloadId }),
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
        body: JSON.stringify({ targetId: focusLinkRetryTargetId, ...strategyPayloadId }),
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
        `/api/club-development/club-strategy/focus-targets?targetId=${encodeURIComponent(targetId)}${
          strategyId ? `&clubStrategyId=${encodeURIComponent(strategyId)}` : ""
        }`,
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

  const strategyEditAside =
    canManage && persisted ? (
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
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
    ) : null;

  return (
    <div className={`mb-8 ${SCE_CD_WORKSPACE_PANEL_CLASS} space-y-5`} data-testid="strategy-authoring-panel">
      <section className="space-y-4" data-testid="strategy-detail-section">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{strategyTitle}</h2>
          {strategyEditAside}
        </div>
        {editing && canManage ? (
          <form onSubmit={onSave} className="max-w-3xl space-y-4" data-testid="strategy-narrative-form">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-[var(--muted)]">Titel</span>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm"
                value={strategyTitle}
                onChange={(e) => setStrategyTitle(e.target.value)}
                data-testid="strategy-title-input"
              />
            </label>
            <ClubStrategyOrgUnitScopePicker
              options={orgUnitOptions}
              selectedScope={orgScope}
              onSelectedScopeChange={setOrgScope}
              disabled={pendingSave}
            />
            <div className="flex flex-wrap gap-x-6 gap-y-3">
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

            <TaskDescriptionFormField
              key={`strategy-situation-${strategyId}-${editing}`}
              label={CD_STRATEGY_AUTHORING_COPY.situationLabel}
              optional
              initialStored={initial.situationText}
              inputId="strategy-situation"
              placeholder={CD_STRATEGY_AUTHORING_COPY.situationPlaceholder}
              enableMentions
              mentionScope="tenant"
              compact
              onSerializedChange={setSituationText}
            />

            <TaskDescriptionFormField
              key={`strategy-alignment-${strategyId}-${editing}`}
              label={CD_STRATEGY_AUTHORING_COPY.alignmentLabel}
              optional
              initialStored={initial.alignmentText}
              inputId="strategy-alignment"
              placeholder={CD_STRATEGY_AUTHORING_COPY.alignmentPlaceholder}
              enableMentions
              mentionScope="tenant"
              compact
              onSerializedChange={setAlignmentText}
            />

            <MotionSaveStatus
              unsaved={unsavedNarrative}
              saveError={saveError}
              saveSuccess={saveSuccess}
              pendingSave={pendingSave}
            />
          </form>
        ) : (
          <div data-testid="strategy-narrative-read">
            <StrategyMetaReadLine
              responsible={responsibleReadLabel}
              period={formatStrategyPeriodSummary({
                periodLabel: initial.periodLabel,
                periodStartsAt: initial.periodStartsAt,
                periodEndsAt: initial.periodEndsAt,
              })}
              nextReview={formatStrategyDateLabel(initial.nextReviewAt)}
            />
            <div className="max-w-3xl space-y-4">
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

      <section className="space-y-3 border-t border-[var(--border)]/60 pt-4" data-testid="strategy-focus-section">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{CD_STRATEGY_AUTHORING_COPY.focusHeading}</h3>
          {focusTargets.length > 0 ? (
            <span className="text-xs text-[var(--muted)] tabular-nums">{focusTargets.length}</span>
          ) : null}
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
          <SceClubDevelopmentEmptyState message={CD_STRATEGY_AUTHORING_COPY.focusEmpty} />
        ) : (
          <ul className="mb-3 space-y-2" data-testid="strategy-focus-cards">
            {focusTargetOverviews.map(({ focus, overview }) => (
              <li key={focus.target.id} className="space-y-1">
                {overview ? (
                  <VereinsentwicklungWorkspaceRecordRow
                    title={overview.title}
                    titleHref={`/vereinsleitung/targets/${focus.target.id}`}
                    responsibleLabel={overview.responsibleLabel}
                    orgUnitLabel={overview.orgUnitLabel}
                    progressPercent={overview.deliveryProgressPercent ?? 0}
                    progressCaption={overview.deliveryProgressCaption}
                    statusLabel={formatTargetStatusLabel(overview.status)}
                    testId={`strategy-focus-row-${focus.target.id}`}
                  />
                ) : (
                  <VereinsentwicklungWorkspaceRecordRow
                    title={focus.target.title}
                    titleHref={`/vereinsleitung/targets/${focus.target.id}`}
                    responsibleLabel={null}
                    orgUnitLabel="—"
                    progressPercent={null}
                    testId={`strategy-focus-row-${focus.target.id}`}
                  />
                )}
                {canManage && editing ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-xs text-[var(--muted)] hover:text-rose-700"
                      disabled={pendingFocus}
                      onClick={() => removeFocusTarget(focus.target.id)}
                    >
                      Schwerpunkt entfernen
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <div className="space-y-3">
            <button
              type="button"
              className="inline-flex items-center rounded-lg bg-[var(--sce-primary)] px-3 py-2 text-sm font-medium text-white"
              data-testid="strategy-focus-create-target"
              data-sce-contextual-create-flow="inline-collapsible"
              onClick={() => setCreateTargetOpen(true)}
            >
              {CD_TARGET_COPY.createTargetInStrategy}
            </button>
            <CreateTargetContextualCollapsibleCard
              expanded={createTargetOpen}
              onExpandedChange={setCreateTargetOpen}
              clubStrategyId={strategyId}
              strategyTitle={strategyTitle}
              contextualFocus={{
                onFinished: (payload) => {
                  if (payload.linkOk) {
                    setFocusLinkRetryTargetId(null);
                    router.refresh();
                  } else if (payload.linkError) {
                    setFocusLinkRetryTargetId(payload.targetId);
                  }
                },
              }}
            />
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--muted)]">{CD_TARGET_COPY.linkExistingTargetToStrategy}</p>
              <ClubDevelopmentTargetSearchPicker
                excludeTargetIds={linkedTargetIds}
                onSelect={addFocusTarget}
                testId="strategy-focus-target-picker"
              />
            </div>
          </div>
        ) : null}
      </section>

      <StrategySupportingMaterialsCard
        meetingCount={supportingCounts.meetings}
        decisionCount={supportingCounts.decisions}
        documentCount={supportingCounts.documents}
      >
        <StrategyAssociationLinkEditor
          initialMeetingRefs={entityRefsFromAuthoring(initial.meetingRefs)}
          initialDecisionRefs={entityRefsFromAuthoring(initial.decisionRefs)}
          availableMeetings={availableMeetings}
          availableDecisions={availableDecisions}
          canManage={canManage}
          clubStrategyId={strategyId}
          editing={editing && canManage}
          compact
          onAssociationsSaved={handleAssociationsSaved}
        />
        <StrategyDocumentReferencesSection
          references={documentReferences}
          canManage={canManage}
          editing={editing && canManage}
          compact
          onReferencesChanged={handleDocumentReferencesChanged}
        />
      </StrategySupportingMaterialsCard>
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

function StrategyMetaReadLine({
  responsible,
  period,
  nextReview,
}: {
  responsible: string;
  period: string;
  nextReview: string;
}) {
  return (
    <p
      className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]"
      data-testid="strategy-meta-read-line"
    >
      <span>
        <span className="font-medium text-[var(--text-2)]">
          {CD_STRATEGY_AUTHORING_COPY.responsibleLabel}:
        </span>{" "}
        {responsible}
      </span>
      <span>
        <span className="font-medium text-[var(--text-2)]">
          {CD_STRATEGY_AUTHORING_COPY.periodLabel}:
        </span>{" "}
        {period}
      </span>
      <span>
        <span className="font-medium text-[var(--text-2)]">
          {CD_STRATEGY_AUTHORING_COPY.nextReviewLabel}:
        </span>{" "}
        {nextReview}
      </span>
    </p>
  );
}

function NarrativeBlock({ label, text, empty }: { label: string; text: string | null; empty: string }) {
  const content = text?.trim();
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
        {content || <span className="text-[var(--muted)]">{empty}</span>}
      </p>
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
