"use client";

import { useMemo, useState } from "react";
import { Building2, MinusCircle, Plus, Trash2, User, UserCircle2, Users, Mail } from "lucide-react";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";
import {
  addExcludeRule,
  addIncludeRule,
  compositionModeHelp,
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
import type { CommunicationAudienceDiscoverPick } from "@/components/admin/communication/audience/CommunicationAudienceSelector";

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

function RuleKindIcon({ typeLabel }: { typeLabel: string }) {
  if (typeLabel.includes("Organisation")) return <Building2 className="h-5 w-5" aria-hidden="true" />;
  if (typeLabel === "Team") return <Users className="h-5 w-5" aria-hidden="true" />;
  if (typeLabel === "Rolle") return <UserCircle2 className="h-5 w-5" aria-hidden="true" />;
  if (typeLabel.includes("Extern")) return <Mail className="h-5 w-5" aria-hidden="true" />;
  return <User className="h-5 w-5" aria-hidden="true" />;
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
          ? "border-[var(--border)] bg-[var(--surface-2)]/80"
          : "border-[var(--border)] bg-[var(--surface-1)]"
      }`}
      data-testid={testId}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 text-sm">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            tone === "exclude"
              ? "bg-[var(--surface-3)] text-[var(--muted)]"
              : "bg-[var(--sce-primary)]/10 text-[var(--sce-primary)]"
          }`}
          aria-hidden="true"
        >
          {tone === "exclude" ? (
            <MinusCircle className="h-5 w-5" />
          ) : (
            <RuleKindIcon typeLabel={typeLabel} />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--muted)]">{typeLabel}</p>
          <p className="truncate font-semibold text-[var(--foreground)]">{valueLabel}</p>
        </div>
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
      <p className="text-sm font-medium text-[var(--foreground)]">Eine Person muss …</p>
      <div
        className="inline-flex w-full flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1 sm:w-auto sm:flex-row"
        role="group"
        aria-label="Kriterienlogik"
      >
        {(
          [
            ["INTERSECTION", "alle Kriterien erfüllen", "UND"],
            ["UNION", "mindestens ein Kriterium erfüllen", "ODER"],
          ] as const
        ).map(([mode, label, hint]) => {
          const selected = value === mode;
          return (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              className={`min-h-10 flex-1 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] sm:px-4 ${
                selected
                  ? "bg-[var(--sce-primary)] text-white shadow-sm"
                  : "text-[var(--foreground)] hover:bg-[var(--surface-1)]"
              }`}
              onClick={() => onChange(mode)}
              data-testid={`zielgruppe-composition-${mode.toLowerCase()}`}
            >
              {label}
              <span className="mt-0.5 block text-xs font-normal opacity-80 sm:mt-0 sm:inline sm:ml-1">
                · {hint}
              </span>
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
  onConfirmBatch,
  dialogTitle,
  dialogDescription,
  testId,
}: {
  label: string;
  disabled?: boolean;
  features: CommunicationAudienceSelectorFeatures;
  selection: ReturnType<typeof zielgruppeDynamicIncludeAudienceSelection>;
  onConfirmBatch: (picks: CommunicationAudienceDiscoverPick[]) => void;
  dialogTitle: string;
  dialogDescription: string;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  const enabledFeatures = useMemo(
    () => ({
      wholeOrganisation: false,
      orgUnits: features.orgUnits ?? false,
      teams: features.teams ?? false,
      roles: features.roles ?? false,
      targetGroups: features.targetGroups ?? false,
      persons: features.persons ?? false,
      externalContacts: features.externalContacts ?? false,
    }),
    [
      features.externalContacts,
      features.orgUnits,
      features.persons,
      features.roles,
      features.targetGroups,
      features.teams,
    ],
  );

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-4 py-2.5 text-sm font-semibold text-[var(--sce-primary)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] sm:w-auto"
        onClick={() => setOpen(true)}
        data-testid={testId}
        aria-haspopup="dialog"
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
        onPick={() => {}}
        batchConfirm
        onConfirmBatch={onConfirmBatch}
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
            Mitglieder werden automatisch hinzugefügt, wenn sie diese Kriterien erfüllen.
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
              Alle aktuellen Vereinsmitglieder werden dynamisch berücksichtigt.
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
                      className="py-1 text-center text-xs font-medium text-[var(--muted)]"
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
              label="+ Bedingung hinzufügen"
              disabled={disabled}
              features={DYNAMIC_FEATURES}
              selection={zielgruppeDynamicIncludeAudienceSelection(value)}
              dialogTitle="Auswahl hinzufügen"
              dialogDescription="Wähle Teams, Organisationseinheiten oder Rollen für diese Zielgruppe."
              testId="zielgruppe-add-condition"
              onConfirmBatch={(picks) => {
                let next = value;
                for (const pick of picks) {
                  if (pick.kind === "orgUnit") {
                    rememberLabel("orgUnit", pick.id, pick.label);
                    next = addIncludeRule(next, "orgUnit", pick.id);
                  } else if (pick.kind === "team") {
                    rememberLabel("team", pick.id, pick.label);
                    next = addIncludeRule(next, "team", pick.id);
                  } else if (pick.kind === "role") {
                    rememberLabel("role", pick.id, pick.label);
                    next = addIncludeRule(next, "role", pick.id);
                  }
                }
                onChange(next);
              }}
            />
          </>
        ) : null}
      </section>

      <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
        <div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">Direkt hinzufügen</h3>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Einzelne Empfänger werden unabhängig von den automatischen Regeln aufgenommen.
          </p>
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
          batchDiscoverConfirm
          discoverDialogTitle="Empfänger hinzufügen"
          discoverDialogDescription="Füge einzelne Personen oder externe Kontakte direkt hinzu."
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
            <p className="mt-1 text-sm text-[var(--text-2)]">
              {hasExclusions
                ? "Diese Personen oder Gruppen werden immer ausgeschlossen."
                : "Diese Personen oder Gruppen werden immer ausgeschlossen."}
            </p>
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
          label="+ Ausschluss hinzufügen"
          disabled={disabled}
          features={EXCLUDE_FEATURES}
          selection={zielgruppeExcludeAudienceSelection(value)}
          dialogTitle="Ausschluss hinzufügen"
          dialogDescription="Wähle Personen oder Gruppen, die nicht zu dieser Zielgruppe gehören sollen."
          testId="zielgruppe-add-exclusion"
          onConfirmBatch={(picks) => {
            let next = value;
            for (const pick of picks) {
              if (pick.kind === "orgUnit") {
                rememberLabel("excludeOrgUnit", pick.id, pick.label);
                next = addExcludeRule(next, "excludeOrgUnit", pick.id);
              } else if (pick.kind === "team") {
                rememberLabel("excludeTeam", pick.id, pick.label);
                next = addExcludeRule(next, "excludeTeam", pick.id);
              } else if (pick.kind === "role") {
                rememberLabel("excludeRole", pick.id, pick.label);
                next = addExcludeRule(next, "excludeRole", pick.id);
              } else if (pick.kind === "person") {
                rememberLabel("excludePerson", pick.id, pick.label);
                next = addExcludeRule(next, "excludePerson", pick.id);
              } else if (pick.kind === "external") {
                rememberLabel("excludeExternalContact", pick.id, pick.label);
                next = addExcludeRule(next, "excludeExternalContact", pick.id);
              }
            }
            onChange(next);
          }}
        />
      </section>
    </div>
  );
}

export { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION };
