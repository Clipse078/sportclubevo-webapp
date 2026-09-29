"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PopoverContent } from "@/components/ui/Popover";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";
import {
  addExcludeRule,
  addIncludeRule,
  compositionModeHelp,
  compositionModeLabel,
  definitionToVisualRules,
  removeExcludeRule,
  removeIncludeRule,
  ZIELGRUPPE_EXCLUDE_KIND_LABEL,
  ZIELGRUPPE_INCLUDE_KIND_LABEL,
  type ZielgruppeExcludeRuleKind,
  type ZielgruppeIncludeRuleKind,
} from "@/lib/communication/zielgruppen/visual-rules";
import {
  searchZielgruppeExternalContactsAction,
  searchZielgruppeOrgUnitsAction,
  searchZielgruppePersonsAction,
  searchZielgruppeRolesAction,
  searchZielgruppeTeamsAction,
} from "@/app/(admin)/dashboard/communication/zielgruppen/actions";
import ZielgruppeBulkEmailDialog from "@/components/admin/communication/zielgruppen/ZielgruppeBulkEmailDialog";
import ZielgruppeHumanRulesPanel from "@/components/admin/communication/zielgruppen/ZielgruppeHumanRulesPanel";
import { summarizeZielgruppeEditorDefinition } from "@/lib/communication/audience/human-audience-summary";
import { ZIELGRUPPE_DYNAMIC_MEMBERSHIP_NOTICE } from "@/lib/communication/zielgruppen/zielgruppen-display";
import { REQUIREMENT_PERSON_SEARCH_MIN_CHARS } from "@/lib/requirements/person-search-constants";

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

type SearchKind =
  | ZielgruppeIncludeRuleKind
  | ZielgruppeExcludeRuleKind;

const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]";

function labelForId(
  kind: SearchKind,
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

function RuleValueSearch({
  kind,
  disabled,
  onPick,
  triggerLabel,
}: {
  kind: SearchKind;
  disabled?: boolean;
  onPick: (id: string, displayLabel: string) => void;
  triggerLabel: string;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    if (!open) return undefined;
    const term = query.trim();
    if (term.length < REQUIREMENT_PERSON_SEARCH_MIN_CHARS) {
      return undefined;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      const isPerson = kind === "person" || kind === "excludePerson";
      const isExternal = kind === "externalContact" || kind === "excludeExternalContact";
      const isOrg = kind === "orgUnit" || kind === "excludeOrgUnit";
      const isTeam = kind === "team" || kind === "excludeTeam";
      const searchFn = isOrg
        ? searchZielgruppeOrgUnitsAction
        : isTeam
          ? searchZielgruppeTeamsAction
          : kind === "role" || kind === "excludeRole"
            ? searchZielgruppeRolesAction
            : isExternal
              ? searchZielgruppeExternalContactsAction
              : searchZielgruppePersonsAction;
      const result = await searchFn(term);
      if (!result.ok) {
        setError(result.message);
        setOptions([]);
      } else if (isPerson) {
        setOptions(
          (result.data as Array<{ personId: string; displayName: string }>).map((row) => ({
            id: row.personId,
            label: row.displayName,
          })),
        );
      } else if (isExternal) {
        setOptions(
          (result.data as Array<{ id: string; label: string; description?: string | null }>).map(
            (row) => ({
              id: row.id,
              label: row.description ? `${row.label} (${row.description})` : row.label,
            }),
          ),
        );
      } else {
        setOptions(result.data as Array<{ id: string; label: string }>);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [kind, open, query]);

  return (
    <div className="relative inline-block w-full sm:w-auto">
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-[var(--border-strong)] px-3 py-2 text-xs font-medium text-[var(--sce-primary)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] sm:w-auto"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid={`zielgruppe-add-${kind}`}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {triggerLabel}
      </button>
      <PopoverContent
        open={open}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        matchAnchorWidth={false}
        maxHeight={280}
        className="w-72 p-2"
        role="dialog"
        aria-label={`${triggerLabel} suchen`}
      >
        <input
          className="fca-input mb-2 w-full text-sm"
          placeholder="Suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={`${triggerLabel} Suchbegriff`}
        />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        {loading ? <p className="text-xs text-[var(--muted)]">Suche…</p> : null}
        <ul className="max-h-52 overflow-y-auto">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--blue)]"
                onClick={() => {
                  onPick(option.id, option.label);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </div>
  );
}

function VisualRuleRow({
  typeLabel,
  valueLabel,
  disabled,
  onRemove,
  testId,
}: {
  typeLabel: string;
  valueLabel: string;
  disabled?: boolean;
  onRemove: () => void;
  testId: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3 sm:flex-row sm:items-center sm:gap-3"
      data-testid={testId}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
        <span className="text-xs font-medium text-[var(--muted)] sm:w-36">{typeLabel}</span>
        <span className="hidden text-xs text-[var(--muted)] sm:inline" aria-hidden="true">
          ist
        </span>
        <span className="rounded-md bg-[var(--surface-2)] px-2.5 py-1.5 text-sm font-medium text-[var(--foreground)]">
          {valueLabel}
        </span>
      </div>
      <button
        type="button"
        disabled={disabled}
        className="inline-flex items-center justify-center gap-1 self-end rounded-md border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--blue)] sm:self-center"
        onClick={onRemove}
        aria-label={`${typeLabel} ${valueLabel} entfernen`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        Entfernen
      </button>
    </div>
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

  function rememberLabel(kind: SearchKind, id: string, displayLabel: string) {
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
  const directIncludeRules = includeRules.filter(
    (rule) => rule.kind === "person" || rule.kind === "externalContact",
  );
  const liveSummary = summarizeZielgruppeEditorDefinition(value, labels);

  return (
    <div className="space-y-8">
      <section className="space-y-2" aria-labelledby="zg-question-heading">
        <h3 id="zg-question-heading" className="text-base font-semibold text-[var(--foreground)]">
          Wer gehört zu dieser Zielgruppe?
        </h3>
        <p className="text-xs leading-5 text-[var(--text-2)]">{ZIELGRUPPE_DYNAMIC_MEMBERSHIP_NOTICE}</p>
      </section>

      <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div>
          <h4 className={SECTION_LABEL}>Dynamisch einschliessen</h4>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Organisation, Teams und Rollen bleiben strukturell — neue Mitglieder werden automatisch
            einbezogen.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[var(--border-strong)]"
            checked={value.wholeOrganisation}
            disabled={disabled}
            onChange={(e) => patch({ wholeOrganisation: e.target.checked })}
            aria-describedby="zg-whole-org-hint"
          />
          <span>
            <span className="block text-sm font-medium text-[var(--foreground)]">
              Ganze Organisation
            </span>
            <span id="zg-whole-org-hint" className="mt-0.5 block text-xs text-[var(--muted)]">
              Alle Personen im Verein (dynamisch zur Versandzeit).
            </span>
          </span>
        </label>

        {!value.wholeOrganisation ? (
          <>
            <fieldset className="space-y-2">
              <legend className="sr-only">Bedingungen kombinieren</legend>
              <p className="text-xs font-medium text-[var(--foreground)]">Bedingungen kombinieren</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="zielgruppe-composition"
                    checked={value.compositionMode === "INTERSECTION"}
                    disabled={disabled}
                    onChange={() => patch({ compositionMode: "INTERSECTION" })}
                  />
                  {compositionModeLabel("INTERSECTION")}
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="zielgruppe-composition"
                    checked={value.compositionMode === "UNION"}
                    disabled={disabled}
                    onChange={() => patch({ compositionMode: "UNION" })}
                  />
                  {compositionModeLabel("UNION")}
                </label>
              </div>
              <p className="text-xs text-[var(--muted)]" aria-live="polite">
                {compositionModeHelp(value.compositionMode)}
              </p>
            </fieldset>

            <div className="space-y-2">
              {dynamicIncludeRules.map((rule) => (
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

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["orgUnit", "Organisationseinheit"],
                  ["team", "Team"],
                  ["role", "Rolle"],
                ] as const
              ).map(([kind, label]) => (
                <RuleValueSearch
                  key={kind}
                  kind={kind}
                  disabled={disabled}
                  triggerLabel={label}
                  onPick={(id, displayLabel) => {
                    rememberLabel(kind, id, displayLabel);
                    onChange(addIncludeRule(value, kind, id));
                  }}
                />
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div>
          <h4 className={SECTION_LABEL}>Direkt hinzufügen</h4>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Einzelne Personen oder externe Kontakte unabhängig von Struktur-Regeln.
          </p>
        </div>
        <div className="space-y-2">
          {directIncludeRules.map((rule) => (
            <VisualRuleRow
              key={rule.id}
              testId={`zg-direct-rule-${rule.id}`}
              typeLabel={ZIELGRUPPE_INCLUDE_KIND_LABEL[rule.kind]}
              valueLabel={labelForId(rule.kind, rule.valueId, labels)}
              disabled={disabled}
              onRemove={() => onChange(removeIncludeRule(value, rule.kind, rule.valueId))}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <RuleValueSearch
            kind="person"
            disabled={disabled}
            triggerLabel="Person"
            onPick={(id, displayLabel) => {
              rememberLabel("person", id, displayLabel);
              onChange(addIncludeRule(value, "person", id));
            }}
          />
          <RuleValueSearch
            kind="externalContact"
            disabled={disabled}
            triggerLabel="Extern"
            onPick={(id, displayLabel) => {
              rememberLabel("externalContact", id, displayLabel);
              onChange(addIncludeRule(value, "externalContact", id));
            }}
          />
          <button
            type="button"
            disabled={disabled}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-dashed border-[var(--border-strong)] px-3 py-2 text-xs font-medium text-[var(--sce-primary)] hover:bg-[var(--surface-2)]"
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

      <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div>
          <h4 className={SECTION_LABEL}>Ausschliessen</h4>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Diese Personen werden immer ausgeschlossen — auch wenn sie eine Einschluss-Bedingung
            erfüllen.
          </p>
        </div>

        <div className="space-y-2">
          {excludeRules.map((rule) => (
            <VisualRuleRow
              key={rule.id}
              testId={`zg-exclude-rule-${rule.id}`}
              typeLabel={ZIELGRUPPE_EXCLUDE_KIND_LABEL[rule.kind]}
              valueLabel={labelForId(rule.kind, rule.valueId, labels)}
              disabled={disabled}
              onRemove={() => onChange(removeExcludeRule(value, rule.kind, rule.valueId))}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["excludeOrgUnit", "Organisationseinheit"],
              ["excludeTeam", "Team"],
              ["excludeRole", "Rolle"],
              ["excludePerson", "Person"],
              ["excludeExternalContact", "Extern"],
            ] as const
          ).map(([kind, label]) => (
            <RuleValueSearch
              key={kind}
              kind={kind}
              disabled={disabled}
              triggerLabel={label}
              onPick={(id, displayLabel) => {
                rememberLabel(kind, id, displayLabel);
                onChange(addExcludeRule(value, kind, id));
              }}
            />
          ))}
        </div>
      </section>

      <section
        className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-3"
        aria-live="polite"
      >
        <h4 className={SECTION_LABEL}>Zusammenfassung</h4>
        <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{liveSummary}</p>
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <ZielgruppeHumanRulesPanel definition={value} labels={labels} />
        </div>
      </section>
    </div>
  );
}

export { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION };
