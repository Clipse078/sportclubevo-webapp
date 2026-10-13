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

const ACTIVITY_KINDS: SceActivityCreateKind[] = [
  "CLUB_EVENT",
  "TRAINING",
  "MATCH",
  "TOURNAMENT",
];

export function SceActivityComposerPreviewHarness({
  initialContainerMode,
}: {
  initialContainerMode: "overlay" | "page";
}) {
  const [activityKind, setActivityKind] = useState<SceActivityCreateKind>("TRAINING");
  const [overlayOpen, setOverlayOpen] = useState(initialContainerMode === "overlay");
  const [isDirty, setIsDirty] = useState(false);
  const [draft, setDraft] = useState<PreviewComposerDraft>({
    title: "Vorschau-Titel",
    notes: "",
    forceValidationError: false,
  });

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
        {
          key: "validierung",
          label: "Validierung",
          render: ({ draft: d, setDraft: setD, fieldErrors }) => (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-2)]">
                Domain-Validierung (Toggle First — kein Checkbox-Control).
              </p>
              <SwitchToggle
                id="preview-force-validation"
                checked={d.forceValidationError}
                onChange={(checked) => setD({ ...d, forceValidationError: checked })}
                label="Validierungsfehler erzwingen"
              />
              {fieldErrors?.title ? (
                <p role="alert" className="text-sm text-[var(--sce-danger)]">
                  {fieldErrors.title}
                </p>
              ) : null}
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

  if (initialContainerMode === "page") {
    return (
      <div className="space-y-6" data-testid="sce-activity-composer-preview-page-root">
        <PreviewControls
          activityKind={activityKind}
          onActivityKind={setActivityKind}
          isDirty={isDirty}
          onDirty={setIsDirty}
        />
        <SceActivityComposer
          definition={definition}
          containerMode="page"
          onClose={() => undefined}
          draft={draft}
          onDraftChange={setDraft}
          isDirty={isDirty}
          onDirtyChange={setIsDirty}
          originContext={origin}
          testId="sce-activity-composer-preview-page"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sce-activity-composer-preview-overlay-root">
      <PreviewControls
        activityKind={activityKind}
        onActivityKind={setActivityKind}
        isDirty={isDirty}
        onDirty={setIsDirty}
      />
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
      <SceActivityComposer
        definition={definition}
        containerMode="overlay"
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        draft={draft}
        onDraftChange={setDraft}
        isDirty={isDirty}
        onDirtyChange={setIsDirty}
        originContext={origin}
        testId="sce-activity-composer-preview-overlay"
      />
    </div>
  );
}

function PreviewControls({
  activityKind,
  onActivityKind,
  isDirty,
  onDirty,
}: {
  activityKind: SceActivityCreateKind;
  onActivityKind: (k: SceActivityCreateKind) => void;
  isDirty: boolean;
  onDirty: (dirty: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
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
      <SwitchToggle
        id="preview-dirty-toggle"
        checked={isDirty}
        onChange={onDirty}
        label="Entwurf als geändert markieren (Dirty)"
      />
    </div>
  );
}
