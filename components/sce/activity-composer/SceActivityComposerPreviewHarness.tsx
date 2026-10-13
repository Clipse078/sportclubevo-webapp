"use client";

import { useMemo, useState } from "react";
import { SwitchToggle } from "@/components/ui/SwitchToggle";
import { Button } from "@/components/ui/Button";
import SceActivityComposer from "@/components/sce/activity-composer/SceActivityComposer";
import {
  createPreviewActivityCreateDefinition,
  type PreviewComposerDraft,
  type PreviewComposerTabId,
} from "@/lib/sce/activity-composer/build-preview-definition";
import type {
  SceActivityCreateKind,
  SceActivityCreateTabDefinition,
} from "@/lib/sce/activity-composer/types";
import type { SceActivityCreateOriginContext } from "@/lib/sce/activity-composer/origin-context";
import type { SceActivityCreateResumeDraft } from "@/lib/sce/activity-composer/draft-persistence-capability";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import { SCE_ACTIVITY_DEFAULT_APPROVAL_STRATEGY } from "@/lib/sce/activity-governance/types";

const ACTIVITY_KINDS: SceActivityCreateKind[] = [
  "CLUB_EVENT",
  "TRAINING",
  "MATCH",
  "TOURNAMENT",
];

const INITIAL_PREVIEW_DRAFT: PreviewComposerDraft = {
  title: "",
  notes: "",
  forceValidationError: false,
  forceDraftSaveError: false,
};

const SAVED_PREVIEW_DRAFT: PreviewComposerDraft = {
  title: "Gespeicherter Entwurf",
  notes: "Vorschau — ohne API",
  forceValidationError: false,
  forceDraftSaveError: false,
};

export function SceActivityComposerPreviewHarness({
  initialContainerMode,
}: {
  initialContainerMode: "overlay" | "page";
}) {
  const [activityKind, setActivityKind] = useState<SceActivityCreateKind>("TRAINING");
  const [scenario, setScenario] = useState<"NEW" | "RESUME_DRAFT">("NEW");
  const [overlayOpen, setOverlayOpen] = useState(initialContainerMode === "overlay");
  const [draft, setDraft] = useState<PreviewComposerDraft>(INITIAL_PREVIEW_DRAFT);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const [publicationMode, setPublicationMode] = useState<"DIRECT_PUBLISH" | "APPROVAL_REQUIRED">(
    "DIRECT_PUBLISH",
  );

  const resumeDraft: SceActivityCreateResumeDraft<PreviewComposerDraft> | undefined =
    scenario === "RESUME_DRAFT"
      ? { draftId: "preview-resume-id", baselineDraft: SAVED_PREVIEW_DRAFT }
      : undefined;

  const tabRenderers = useMemo((): SceActivityCreateTabDefinition<
    PreviewComposerTabId,
    PreviewComposerDraft
  >[] => [
        {
          key: "grunddaten",
          label: "Grunddaten",
          render: ({ draft: d, setDraft: setD }) => (
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Titel (Vorschau)
              <input
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                value={d.title}
                onChange={(e) => setD({ ...d, title: e.target.value })}
                data-testid="preview-title-input"
              />
            </label>
          ),
        },
        {
          key: "details",
          label: "Details",
          render: ({ draft: d, setDraft: setD }) => (
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Notizen
              <textarea
                className="mt-1 min-h-[8rem] w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                value={d.notes}
                onChange={(e) => setD({ ...d, notes: e.target.value })}
              />
            </label>
          ),
        },
        {
          key: "ressourcen",
          label: "Ressourcen",
          render: () => (
            <div className="space-y-2 text-sm text-[var(--text-2)]">
              {Array.from({ length: 24 }, (_, i) => (
                <p key={i}>Scrollbare Vorschau-Zeile {i + 1} — kein API-Aufruf.</p>
              ))}
            </div>
          ),
        },
      ],
    [],
  );

  const definition = useMemo(
    () => createPreviewActivityCreateDefinition(activityKind, tabRenderers),
    [activityKind, tabRenderers],
  );

  const origin: SceActivityCreateOriginContext = {
    kind: "PLANNING_SURFACE",
    pathname: "/sce-preview/activity-composer",
    selectedWeek: "2026-W42",
  };

  const effectiveGovernance: SceActivityEffectiveGovernance = {
    activityType: activityKind,
    personId: "preview-person",
    mayCreate: true,
    publicationAuthority: publicationMode,
    approvalStrategy: SCE_ACTIVITY_DEFAULT_APPROVAL_STRATEGY,
    validatorPersonIds: publicationMode === "APPROVAL_REQUIRED" ? ["validator-1"] : [],
  };

  const composerKey = `${activityKind}-${scenario}-${initialContainerMode}-${publicationMode}`;

  const composer = (
    <SceActivityComposer
      key={composerKey}
      definition={definition}
      containerMode={initialContainerMode === "page" ? "page" : "overlay"}
      open={initialContainerMode === "overlay" ? overlayOpen : undefined}
      onClose={() => setOverlayOpen(false)}
      draft={scenario === "RESUME_DRAFT" ? draft : draft}
      onDraftChange={setDraft}
      resumeDraft={resumeDraft}
      onSuccess={(result) => setLastOutcome(result.outcome)}
      originContext={origin}
      effectiveGovernance={effectiveGovernance}
      testId={
        initialContainerMode === "page"
          ? "sce-activity-composer-preview-page"
          : "sce-activity-composer-preview-overlay"
      }
    />
  );

  const controls = (
    <PreviewControls
      activityKind={activityKind}
      onActivityKind={setActivityKind}
      scenario={scenario}
      onScenario={(next) => {
        setScenario(next);
        setDraft(next === "RESUME_DRAFT" ? SAVED_PREVIEW_DRAFT : INITIAL_PREVIEW_DRAFT);
        setLastOutcome(null);
      }}
      lastOutcome={lastOutcome}
      draft={draft}
      onDraftChange={setDraft}
      publicationMode={publicationMode}
      onPublicationMode={setPublicationMode}
    />
  );

  if (initialContainerMode === "page") {
    return (
      <div className="space-y-6" data-testid="sce-activity-composer-preview-page-root">
        {controls}
        {composer}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sce-activity-composer-preview-overlay-root">
      {controls}
      <div
        className="relative min-h-[28rem] rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6"
        data-sce-modal-background
      >
        <p className="mb-4 text-sm text-[var(--text-2)]">
          Simulierte Planungsoberfläche (de-emphasis bei geöffnetem Composer).
        </p>
        <Button type="button" onClick={() => setOverlayOpen(true)}>
          Composer öffnen (Overlay)
        </Button>
      </div>
      {composer}
    </div>
  );
}

function PreviewControls({
  activityKind,
  onActivityKind,
  scenario,
  onScenario,
  lastOutcome,
  draft,
  onDraftChange,
  publicationMode,
  onPublicationMode,
}: {
  activityKind: SceActivityCreateKind;
  onActivityKind: (k: SceActivityCreateKind) => void;
  scenario: "NEW" | "RESUME_DRAFT";
  onScenario: (s: "NEW" | "RESUME_DRAFT") => void;
  lastOutcome: string | null;
  draft: PreviewComposerDraft;
  onDraftChange: (draft: PreviewComposerDraft) => void;
  publicationMode: "DIRECT_PUBLISH" | "APPROVAL_REQUIRED";
  onPublicationMode: (mode: "DIRECT_PUBLISH" | "APPROVAL_REQUIRED") => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        Vorschau-Steuerung (kein Produktions-Composer-Tab)
      </p>
      <div className="flex flex-wrap items-end gap-4">
      <label className="text-sm font-medium text-[var(--foreground)]">
        Aktivitätstyp
        <select
          className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          value={activityKind}
          onChange={(e) => onActivityKind(e.target.value as SceActivityCreateKind)}
          data-testid="preview-activity-kind"
        >
          {ACTIVITY_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-[var(--foreground)]">
        Szenario
        <select
          className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          value={scenario}
          onChange={(e) => onScenario(e.target.value as "NEW" | "RESUME_DRAFT")}
          data-testid="preview-scenario"
        >
          <option value="NEW">Neue Aktivität</option>
          <option value="RESUME_DRAFT">Gespeicherter Entwurf</option>
        </select>
      </label>
      <label className="text-sm font-medium text-[var(--foreground)]">
        Freigabe-Policy (Vorschau)
        <select
          className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          value={publicationMode}
          onChange={(e) =>
            onPublicationMode(e.target.value as "DIRECT_PUBLISH" | "APPROVAL_REQUIRED")
          }
          data-testid="preview-publication-mode"
        >
          <option value="DIRECT_PUBLISH">Direct publishing</option>
          <option value="APPROVAL_REQUIRED">Approval required</option>
        </select>
      </label>
      {lastOutcome ? (
        <p className="text-sm text-[var(--text-2)]" data-testid="preview-last-outcome">
          Letztes Ergebnis: {lastOutcome}
        </p>
      ) : null}
      </div>
      <div
        className="flex flex-col gap-3 border-t border-[var(--border)] pt-4"
        data-testid="preview-debug-governance-region"
      >
        <p className="text-sm text-[var(--text-2)]">
          Commit-Validierung / API-Simulation — außerhalb der Domain-Tabs (01B-R3).
        </p>
        <SwitchToggle
          id="preview-force-validation"
          checked={draft.forceValidationError}
          onChange={(checked) => onDraftChange({ ...draft, forceValidationError: checked })}
          label="Commit-/API-Fehler erzwingen"
        />
        <SwitchToggle
          id="preview-force-draft-save-error"
          checked={draft.forceDraftSaveError}
          onChange={(checked) => onDraftChange({ ...draft, forceDraftSaveError: checked })}
          label="Entwurf-Speicherfehler erzwingen"
        />
      </div>
    </div>
  );
}
