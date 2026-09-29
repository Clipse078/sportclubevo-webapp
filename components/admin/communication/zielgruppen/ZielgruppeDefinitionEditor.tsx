"use client";

import { useRef, useState } from "react";
import { MinusCircle, Plus, Trash2 } from "lucide-react";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";
import {
  addExcludeRule,
  addIncludeRule,
  compositionModeHelp,
  compositionModeLabel,
  compositionModeShortHint,
  definitionToVisualRules,
  removeExcludeRule,
  removeIncludeRule,
  ZIELGRUPPE_EXCLUDE_KIND_LABEL,
  ZIELGRUPPE_INCLUDE_KIND_LABEL,
  type ZielgruppeExcludeRuleKind,
  type ZielgruppeIncludeRuleKind,
} from "@/lib/communication/zielgruppen/visual-rules";
import {
  mergeDirectAudienceSelectionIntoDefinition,
  zielgruppeDirectAudienceSelection,
  zielgruppeDynamicIncludeAudienceSelection,
  zielgruppeExcludeAudienceSelection,
} from "@/lib/communication/zielgruppen/audience-selection-bridge";
import CommunicationAudienceSelector, {
  CommunicationAudienceDiscoverPanel,
  type CommunicationAudienceSelectorFeatures,
} from "@/components/admin/communication/audience/CommunicationAudienceSelector";
import ZielgruppeBulkEmailDialog from "@/components/admin/communication/zielgruppen/ZielgruppeBulkEmailDialog";
import { useDesktopLayout } from "@/lib/ui/use-desktop-layout";

type KnownLabels = {
  orgUnits: Record<string, string>;
  teams: Record<string, string>;
  roles: Record<string, string>;
  persons: Record<string, string>;
  externalContacts?: Record<string, string>;
};

type Props = {
  value: ZielgruppeEditorDefinition;
  onChange: (value: ZielgruppeEditorDefinition) => void;
  knownLabels?: KnownLabels;
  disabled?: boolean;
};

const DYNAMIC_FEATURES: CommunicationAudienceSelectorFeatures = {
  wholeOrganisation: false,
  orgUnits: true,
  teams: true,
  roles: true,
  targetGroups: false,
  persons: false,
  externalContacts: false,
};

const DIRECT_FEATURES: CommunicationAudienceSelectorFeatures = {
  wholeOrganisation: false,
  orgUnits: false,
  teams: false,
  roles: false,
  targetGroups: false,
  persons: true,
  externalContacts: true,
};

const EXCLUDE_FEATURES: CommunicationAudienceSelectorFeatures = {
  wholeOrganisation: false,
  orgUnits: true,
  teams: true,
  roles: true,
  targetGroups: false,
  persons: true,
  externalContacts: true,
};

function labelForId(
  kind: ZielgruppeIncludeRuleKind | ZielgruppeExcludeRuleKind,
  id: string,
  labels: KnownLabels,
): string {
  if (kind === "orgUnit" || kind === "excludeOrgUnit") return labels.orgUnits[id] ?? "…";
  if (kind === "team" || kind === "excludeTeam") return labels.teams[id] ?? "…";
  if (kind === "role" || kind === "excludeRole") return labels.roles[id] ?? "…";
  if (kind === "externalContact" || kind === "excludeExternalContact") {
    return labels.externalContacts?.[id] ?? labels.persons[id] ?? "…";
  }
  return labels.persons[id] ?? "…";
}

function VisualRuleRow({
  typeLabel,
  valueLabel,
  disabled,
  onRemove,
  testId,
  tone = "default",
}: {
  typeLabel: string;
  valueLabel: string;
  disabled?: boolean;
  onRemove: () => void;
  testId: string;
  tone?: "default" | "exclude";
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-3 ${
        tone === "exclude"
          ? "border-rose-200/80 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20"
          : "border-[var(--border)] bg-[var(--surface-1)]"
      }`}
      data-testid={testId}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {tone === "exclude" ? (
          <MinusCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
        ) : null}
        <span className="font-medium text-[var(--muted)]">{typeLabel}</span>
        <span className="text-[var(--muted)]" aria-hidden="true">
          ist
        </span>
        <span className="rounded-md bg-[var(--surface-2)] px-2.5 py-1 font-medium text-[var(--foreground)]">
          {valueLabel}
        </span>
      </div>
      <button
        type="button"
        disabled={disabled}
        className="inline-flex min-h-10 items-center justify-center gap-1 self-end rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--blue)] sm:self-center"
        onClick={onRemove}
        aria-label={`${typeLabel} ${valueLabel} entfernen`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Entfernen</span>
      </button>
    </div>
  );
}

function CompositionSegmentedControl({
  value,
  disabled,
  onChange,
}: {
  value: ZielgruppeEditorDefinition["compositionMode"];
  disabled?: boolean;
  onChange: (mode: ZielgruppeEditorDefinition["compositionMode"]) => void;
}) {
  return (
    <div className="space-y-2">
      <div
        className="inline-flex w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1 sm:w-auto"
        role="group"
        aria-label="Bedingungen kombinieren"
      >
        {(
          [
            ["INTERSECTION", "Alle Bedingungen", "UND"],
            ["UNION", "Mindestens eine", "ODER"],
          ] as const
        ).map(([mode, label, hint]) => {
          const selected = value === mode;
          return (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              className={`min-h-10 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] sm:flex-none sm:px-4 ${
                selected
                  ? "bg-[var(--sce-primary)] text-white shadow-sm"
                  : "text-[var(--foreground)] hover:bg-[var(--surface-1)]"
              }`}
              onClick={() => onChange(mode)}
              data-testid={`zielgruppe-composition-${mode.toLowerCase()}`}
            >
              {label}
              <span className="ml-1.5 text-xs font-normal opacity-80">({hint})</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[var(--muted)]" aria-live="polite">
        {compositionModeHelp(value)}
      </p>
    </div>
  );
}

function DiscoverAddButton({
  label,
  disabled,
  features,
  selection,
  onPick,
  dialogTitle,
  dialogDescription,
  testId,
}: {
  label: string;
  disabled?: boolean;
  features: CommunicationAudienceSelectorFeatures;
  selection: ReturnType<typeof zielgruppeDynamicIncludeAudienceSelection>;
  onPick: (
    kind: "team" | "orgUnit" | "role" | "person" | "external" | "targetGroup",
    id: string,
    label: string,
  ) => void;
  dialogTitle: string;
  dialogDescription: string;
  testId: string;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const useDialog = !useDesktopLayout();
  const enabledFeatures = {
    wholeOrganisation: false,
    orgUnits: features.orgUnits ?? false,
    teams: features.teams ?? false,
    roles: features.roles ?? false,
    targetGroups: features.targetGroups ?? false,
    persons: features.persons ?? false,
    externalContacts: features.externalContacts ?? false,
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--sce-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] sm:w-auto"
        onClick={() => setOpen(true)}
        data-testid={testId}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
      <CommunicationAudienceDiscoverPanel
        open={open}
        onOpenChange={setOpen}
        context="ORGANISATION"
        disabled={disabled}
        enabledFeatures={enabledFeatures}
        selection={selection}
        onPick={onPick}
        anchorRef={anchorRef}
        useDialog={useDialog}
        dialogTitle={dialogTitle}
        dialogDescription={dialogDescription}
      />
    </>
  );
}

export default function ZielgruppeDefinitionEditor({
  value,
  onChange,
  knownLabels,
  disabled,
}: Props) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [dynamicLabels, setDynamicLabels] = useState<KnownLabels>({
    orgUnits: {},
    teams: {},
    roles: {},
    persons: {},
    externalContacts: {},
  });
  const labels: KnownLabels = {
    orgUnits: { ...dynamicLabels.orgUnits, ...knownLabels?.orgUnits },
    teams: { ...dynamicLabels.teams, ...knownLabels?.teams },
    roles: { ...dynamicLabels.roles, ...knownLabels?.roles },
    persons: { ...dynamicLabels.persons, ...knownLabels?.persons },
    externalContacts: {
      ...dynamicLabels.externalContacts,
      ...(knownLabels?.externalContacts ?? {}),
    },
  };

  function patch(partial: Partial<ZielgruppeEditorDefinition>) {
    onChange({ ...value, ...partial });
  }

  function rememberLabel(
    kind: ZielgruppeIncludeRuleKind | ZielgruppeExcludeRuleKind,
    id: string,
    displayLabel: string,
  ) {
    const key =
      kind === "orgUnit" || kind === "excludeOrgUnit"
        ? "orgUnits"
        : kind === "team" || kind === "excludeTeam"
          ? "teams"
          : kind === "role" || kind === "excludeRole"
            ? "roles"
            : kind === "externalContact" || kind === "excludeExternalContact"
              ? "externalContacts"
              : "persons";
    setDynamicLabels((prev) => ({
      ...prev,
      [key]: { ...prev[key], [id]: displayLabel },
    }));
  }

  const { includeRules, excludeRules } = definitionToVisualRules(value);
  const dynamicIncludeRules = includeRules.filter(
    (rule) => rule.kind === "orgUnit" || rule.kind === "team" || rule.kind === "role",
  );
  const hasExclusions = excludeRules.length > 0;

  return (
    <div className="space-y-6" data-testid="zielgruppe-audience-builder">
      <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
        <div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">Automatisch einschliessen</h3>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Mitglieder werden automatisch anhand dieser Regeln hinzugefügt.
          </p>
        </div>

        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-4 transition-colors hover:bg-[var(--surface-2)]">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-[var(--border-strong)]"
            checked={value.wholeOrganisation}
            disabled={disabled}
            onChange={(e) => patch({ wholeOrganisation: e.target.checked })}
            aria-describedby="zg-whole-org-hint"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[var(--foreground)]">Ganze Organisation</span>
            <span id="zg-whole-org-hint" className="mt-0.5 block text-xs text-[var(--muted)]">
              Alle Personen im Verein — dynamisch zur Versandzeit.
            </span>
          </span>
        </label>

        {!value.wholeOrganisation ? (
          <>
            <CompositionSegmentedControl
              value={value.compositionMode}
              disabled={disabled}
              onChange={(mode) => patch({ compositionMode: mode })}
            />

            <div className="space-y-3">
              {dynamicIncludeRules.map((rule, index) => (
                <div key={rule.id} className="space-y-2">
                  {index > 0 ? (
                    <p
                      className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                      aria-hidden="true"
                    >
                      {compositionModeShortHint(value.compositionMode)}
                    </p>
                  ) : null}
                  <VisualRuleRow
                    testId={`zg-include-rule-${rule.id}`}
                    typeLabel={ZIELGRUPPE_INCLUDE_KIND_LABEL[rule.kind]}
                    valueLabel={labelForId(rule.kind, rule.valueId, labels)}
                    disabled={disabled}
                    onRemove={() => onChange(removeIncludeRule(value, rule.kind, rule.valueId))}
                  />
                </div>
              ))}
            </div>

            <DiscoverAddButton
              label="Bedingung hinzufügen"
              disabled={disabled}
              features={DYNAMIC_FEATURES}
              selection={zielgruppeDynamicIncludeAudienceSelection(value)}
              dialogTitle="Bedingung hinzufügen"
              dialogDescription="Organisationseinheit, Team oder Rolle wählen."
              testId="zielgruppe-add-condition"
              onPick={(kind, id, displayLabel) => {
                if (kind === "orgUnit") {
                  rememberLabel("orgUnit", id, displayLabel);
                  onChange(addIncludeRule(value, "orgUnit", id));
                } else if (kind === "team") {
                  rememberLabel("team", id, displayLabel);
                  onChange(addIncludeRule(value, "team", id));
                } else if (kind === "role") {
                  rememberLabel("role", id, displayLabel);
                  onChange(addIncludeRule(value, "role", id));
                }
              }}
            />
          </>
        ) : null}
      </section>

      <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
        <div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">Direkt hinzufügen</h3>
          <p className="mt-1 text-sm text-[var(--text-2)]">Einzelne Empfänger zusätzlich aufnehmen.</p>
        </div>

        <CommunicationAudienceSelector
          value={zielgruppeDirectAudienceSelection(value)}
          onChange={(selection) =>
            onChange(mergeDirectAudienceSelectionIntoDefinition(value, selection))
          }
          context="ORGANISATION"
          features={DIRECT_FEATURES}
          disabled={disabled}
          compact
          singleAddTrigger
          showInlinePreview={false}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            className="text-sm font-medium text-[var(--sce-primary)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--blue)]"
            onClick={() => setBulkOpen(true)}
            data-testid="zielgruppe-bulk-email-open"
          >
            Mehrere E-Mail-Adressen hinzufügen
          </button>
        </div>

        <ZielgruppeBulkEmailDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          disabled={disabled}
          onApplied={({ externalContactIds, personIds }) => {
            let next = value;
            for (const personId of personIds) {
              next = addIncludeRule(next, "person", personId);
            }
            for (const externalContactId of externalContactIds) {
              next = addIncludeRule(next, "externalContact", externalContactId);
            }
            onChange(next);
          }}
        />
      </section>

      <section
        className={`space-y-4 rounded-xl border bg-[var(--surface-1)] p-4 sm:p-5 ${
          hasExclusions ? "border-[var(--border)]" : "border-dashed border-[var(--border)]"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--foreground)]">Ausschliessen</h3>
            {!hasExclusions ? (
              <p className="mt-1 text-sm text-[var(--muted)]">Keine Ausschlüsse</p>
            ) : (
              <p className="mt-1 text-sm text-[var(--text-2)]">
                Immer ausgeschlossen — auch bei erfüllten Einschluss-Regeln.
              </p>
            )}
          </div>
        </div>

        {hasExclusions ? (
          <div className="space-y-2">
            {excludeRules.map((rule) => (
              <VisualRuleRow
                key={rule.id}
                testId={`zg-exclude-rule-${rule.id}`}
                tone="exclude"
                typeLabel={ZIELGRUPPE_EXCLUDE_KIND_LABEL[rule.kind]}
                valueLabel={labelForId(rule.kind, rule.valueId, labels)}
                disabled={disabled}
                onRemove={() => onChange(removeExcludeRule(value, rule.kind, rule.valueId))}
              />
            ))}
          </div>
        ) : null}

        <DiscoverAddButton
          label="Ausschluss hinzufügen"
          disabled={disabled}
          features={EXCLUDE_FEATURES}
          selection={zielgruppeExcludeAudienceSelection(value)}
          dialogTitle="Ausschluss hinzufügen"
          dialogDescription="Personen oder Strukturen dauerhaft von dieser Zielgruppe ausschliessen."
          testId="zielgruppe-add-exclusion"
          onPick={(kind, id, displayLabel) => {
            if (kind === "orgUnit") {
              rememberLabel("excludeOrgUnit", id, displayLabel);
              onChange(addExcludeRule(value, "excludeOrgUnit", id));
            } else if (kind === "team") {
              rememberLabel("excludeTeam", id, displayLabel);
              onChange(addExcludeRule(value, "excludeTeam", id));
            } else if (kind === "role") {
              rememberLabel("excludeRole", id, displayLabel);
              onChange(addExcludeRule(value, "excludeRole", id));
            } else if (kind === "person") {
              rememberLabel("excludePerson", id, displayLabel);
              onChange(addExcludeRule(value, "excludePerson", id));
            } else if (kind === "external") {
              rememberLabel("excludeExternalContact", id, displayLabel);
              onChange(addExcludeRule(value, "excludeExternalContact", id));
            }
          }}
        />
      </section>
    </div>
  );
}

export { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION };
