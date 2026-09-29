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
import { emptyCommunicationAudienceSelection } from "@/lib/communication/audience/communication-audience-selection";
import {
  zielgruppeExcludeAudienceSelection,
  zielgruppeIncludeAudienceSelection,
} from "@/lib/communication/zielgruppen/audience-selection-bridge";
import {
  CommunicationAudienceDiscoverPanel,
  type CommunicationAudienceSelectorFeatures,
} from "@/components/admin/communication/audience/CommunicationAudienceSelector";
import type { CommunicationAudienceDiscoverPick } from "@/components/admin/communication/audience/CommunicationAudienceSelector";
import ZielgruppeBulkEmailDialog from "@/components/admin/communication/zielgruppen/ZielgruppeBulkEmailDialog";

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

const INCLUDE_FEATURES: CommunicationAudienceSelectorFeatures = {
  wholeOrganisation: false,
  orgUnits: true,
  teams: true,
  roles: true,
  targetGroups: false,
  persons: true,
  externalContacts: false,
};

const INCLUDE_PERSON_ONLY_FEATURES: CommunicationAudienceSelectorFeatures = {
  wholeOrganisation: false,
  orgUnits: false,
  teams: false,
  roles: false,
  targetGroups: false,
  persons: true,
  externalContacts: false,
};

const EXTERNAL_FEATURES: CommunicationAudienceSelectorFeatures = {
  wholeOrganisation: false,
  orgUnits: false,
  teams: false,
  roles: false,
  targetGroups: false,
  persons: false,
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

function personInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
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
  avatarInitials,
}: {
  typeLabel: string;
  valueLabel: string;
  disabled?: boolean;
  onRemove: () => void;
  testId: string;
  tone?: "default" | "exclude";
  avatarInitials?: string;
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
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
            tone === "exclude"
              ? "bg-[var(--surface-3)] text-[var(--muted)]"
              : avatarInitials
                ? "bg-[var(--sce-primary)]/15 text-[var(--sce-primary)]"
                : "bg-[var(--sce-primary)]/10 text-[var(--sce-primary)]"
          }`}
          aria-hidden="true"
        >
          {tone === "exclude" ? (
            <MinusCircle className="h-5 w-5" />
          ) : avatarInitials ? (
            avatarInitials
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
  selection: ReturnType<typeof zielgruppeIncludeAudienceSelection>;
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
        context="TARGET_GROUP_MANAGEMENT"
        disabled={disabled}
        enabledFeatures={enabledFeatures}
        selection={selection}
        onPick={() => {}}
        batchConfirm
        onConfirmBatch={onConfirmBatch}
        dialogTitle={dialogTitle}
        dialogDescription={dialogDescription}
        searchPlaceholder="Personen, Teams, Organisation oder Rollen suchen …"
      />
    </>
  );
}

function applyIncludePicks(
  definition: ZielgruppeEditorDefinition,
  picks: CommunicationAudienceDiscoverPick[],
): ZielgruppeEditorDefinition {
  let next = definition;
  for (const pick of picks) {
    if (pick.kind === "orgUnit") {
      next = addIncludeRule(next, "orgUnit", pick.id);
    } else if (pick.kind === "team") {
      next = addIncludeRule(next, "team", pick.id);
    } else if (pick.kind === "role") {
      next = addIncludeRule(next, "role", pick.id);
    } else if (pick.kind === "person") {
      next = addIncludeRule(next, "person", pick.id);
    }
  }
  return next;
}

export default function ZielgruppeDefinitionEditor({
  value,
  onChange,
  knownLabels,
  disabled,
}: Props) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [externalPickerOpen, setExternalPickerOpen] = useState(false);
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
  const directPersonRules = includeRules.filter((rule) => rule.kind === "person");
  const externalIncludeRules = includeRules.filter((rule) => rule.kind === "externalContact");
  const hasExclusions = excludeRules.length > 0;
  const includePickerFeatures = value.wholeOrganisation ? INCLUDE_PERSON_ONLY_FEATURES : INCLUDE_FEATURES;

  const externalSelection = useMemo(
    () => ({
      ...emptyCommunicationAudienceSelection(),
      externalContactIds: [...value.includeExternalContactIds],
    }),
    [value.includeExternalContactIds],
  );

  return (
    <div className="space-y-6" data-testid="zielgruppe-audience-builder">
      <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
        <div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">Einschliessen</h3>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Bestimme, wer zu dieser Zielgruppe gehört.
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

        {!value.wholeOrganisation && dynamicIncludeRules.length > 0 ? (
          <div className="space-y-3" data-testid="zielgruppe-include-criteria">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Kriterien</p>
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
          </div>
        ) : !value.wholeOrganisation ? (
          <CompositionSegmentedControl
            value={value.compositionMode}
            disabled={disabled}
            onChange={(mode) => patch({ compositionMode: mode })}
          />
        ) : null}

        {directPersonRules.length > 0 ? (
          <div className="space-y-3" data-testid="zielgruppe-include-direct-persons">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Direkt ausgewählt
            </p>
            <div className="space-y-2">
              {directPersonRules.map((rule) => {
                const name = labelForId(rule.kind, rule.valueId, labels);
                return (
                  <VisualRuleRow
                    key={rule.id}
                    testId={`zg-include-rule-${rule.id}`}
                    typeLabel={ZIELGRUPPE_INCLUDE_KIND_LABEL[rule.kind]}
                    valueLabel={name}
                    avatarInitials={personInitials(name)}
                    disabled={disabled}
                    onRemove={() => onChange(removeIncludeRule(value, rule.kind, rule.valueId))}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        <DiscoverAddButton
          label="Auswahl hinzufügen"
          disabled={disabled}
          features={includePickerFeatures}
          selection={zielgruppeIncludeAudienceSelection(value)}
          dialogTitle="Auswahl hinzufügen"
          dialogDescription="Wähle Personen, Teams, Organisationseinheiten oder Rollen für diese Zielgruppe."
          testId="zielgruppe-add-include"
          onConfirmBatch={(picks) => {
            let next = value;
            for (const pick of picks) {
              if (pick.kind === "orgUnit") rememberLabel("orgUnit", pick.id, pick.label);
              else if (pick.kind === "team") rememberLabel("team", pick.id, pick.label);
              else if (pick.kind === "role") rememberLabel("role", pick.id, pick.label);
              else if (pick.kind === "person") rememberLabel("person", pick.id, pick.label);
            }
            next = applyIncludePicks(next, picks);
            onChange(next);
          }}
        />
      </section>

      <section
        className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5"
        data-testid="zielgruppe-external-recipients"
      >
        <div>
          <h3 className="text-base font-semibold text-[var(--foreground)]">Externe Empfänger</h3>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Füge Kontakte hinzu, die nicht als Person im Verein geführt werden.
          </p>
        </div>

        {externalIncludeRules.length > 0 ? (
          <div className="space-y-2">
            {externalIncludeRules.map((rule) => (
              <VisualRuleRow
                key={rule.id}
                testId={`zg-include-rule-${rule.id}`}
                typeLabel={ZIELGRUPPE_INCLUDE_KIND_LABEL[rule.kind]}
                valueLabel={labelForId(rule.kind, rule.valueId, labels)}
                disabled={disabled}
                onRemove={() => onChange(removeIncludeRule(value, rule.kind, rule.valueId))}
              />
            ))}
          </div>
        ) : null}

        <>
          <button
            type="button"
            disabled={disabled}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-4 py-2.5 text-sm font-semibold text-[var(--sce-primary)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] sm:w-auto"
            onClick={() => setExternalPickerOpen(true)}
            data-testid="zielgruppe-add-external"
            aria-haspopup="dialog"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Externen Kontakt hinzufügen
          </button>
          <CommunicationAudienceDiscoverPanel
            open={externalPickerOpen}
            onOpenChange={setExternalPickerOpen}
            context="TARGET_GROUP_MANAGEMENT"
            disabled={disabled}
            enabledFeatures={{
              wholeOrganisation: false,
              orgUnits: false,
              teams: false,
              roles: false,
              targetGroups: false,
              persons: EXTERNAL_FEATURES.persons ?? false,
              externalContacts: EXTERNAL_FEATURES.externalContacts ?? true,
            }}
            selection={externalSelection}
            onPick={() => {}}
            batchConfirm
            onConfirmBatch={(picks) => {
              let next = value;
              for (const pick of picks) {
                if (pick.kind !== "external") continue;
                rememberLabel("externalContact", pick.id, pick.label);
                next = addIncludeRule(next, "externalContact", pick.id);
              }
              onChange(next);
            }}
            dialogTitle="Externen Kontakt hinzufügen"
            dialogDescription="Füge einen Kontakt hinzu, der nicht als Person im Verein geführt wird."
          />
        </>

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
              Diese Personen oder Gruppen werden immer ausgeschlossen.
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
          label="Ausschluss hinzufügen"
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
