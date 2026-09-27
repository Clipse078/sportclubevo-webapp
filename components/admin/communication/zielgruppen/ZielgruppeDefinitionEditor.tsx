"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { PopoverContent } from "@/components/ui/Popover";
import ZielgruppeSelectorChip from "@/components/admin/communication/zielgruppen/ZielgruppeSelectorChip";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";
import {
  searchZielgruppeOrgUnitsAction,
  searchZielgruppePersonsAction,
  searchZielgruppeRolesAction,
  searchZielgruppeTeamsAction,
} from "@/app/(admin)/dashboard/communication/zielgruppen/actions";
import { REQUIREMENT_PERSON_SEARCH_MIN_CHARS } from "@/lib/requirements/person-search-constants";

type KnownLabels = {
  orgUnits: Record<string, string>;
  teams: Record<string, string>;
  roles: Record<string, string>;
  persons: Record<string, string>;
};

type Props = {
  value: ZielgruppeEditorDefinition;
  onChange: (value: ZielgruppeEditorDefinition) => void;
  knownLabels?: KnownLabels;
  disabled?: boolean;
};

type SearchKind = "orgUnit" | "team" | "role" | "personInclude" | "personExclude";

const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]";

function SearchAddButton({
  kind,
  label,
  disabled,
  onPick,
}: {
  kind: SearchKind;
  label: string;
  disabled?: boolean;
  onPick: (id: string, displayLabel: string) => void;
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
      setOptions([]);
      return undefined;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      const searchFn =
        kind === "orgUnit"
          ? searchZielgruppeOrgUnitsAction
          : kind === "team"
            ? searchZielgruppeTeamsAction
            : kind === "role"
              ? searchZielgruppeRolesAction
              : searchZielgruppePersonsAction;
      const result = await searchFn(term);
      if (!result.ok) {
        setError(result.message);
        setOptions([]);
      } else if (kind === "personInclude" || kind === "personExclude") {
        setOptions(
          (result.data as Array<{ personId: string; displayName: string }>).map((row) => ({
            id: row.personId,
            label: row.displayName,
          })),
        );
      } else {
        setOptions(result.data as Array<{ id: string; label: string }>);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [kind, open, query]);

  return (
    <div className="relative inline-block">
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid={`zielgruppe-add-${kind}`}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </button>
      <PopoverContent
        open={open}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        matchAnchorWidth={false}
        maxHeight={280}
        className="w-72 p-2"
        role="dialog"
        aria-label={`${label} suchen`}
      >
        <input
          className="fca-input mb-2 w-full text-sm"
          placeholder="Suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={`${label} Suchbegriff`}
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

export default function ZielgruppeDefinitionEditor({
  value,
  onChange,
  knownLabels,
  disabled,
}: Props) {
  const [dynamicLabels, setDynamicLabels] = useState<KnownLabels>({
    orgUnits: {},
    teams: {},
    roles: {},
    persons: {},
  });

  const labels: KnownLabels = {
    orgUnits: { ...dynamicLabels.orgUnits, ...knownLabels?.orgUnits },
    teams: { ...dynamicLabels.teams, ...knownLabels?.teams },
    roles: { ...dynamicLabels.roles, ...knownLabels?.roles },
    persons: { ...dynamicLabels.persons, ...knownLabels?.persons },
  };

  function patch(partial: Partial<ZielgruppeEditorDefinition>) {
    onChange({ ...value, ...partial });
  }

  function addId(
    field: keyof Pick<
      ZielgruppeEditorDefinition,
      "orgUnitIds" | "teamIds" | "roleIds" | "includePersonIds" | "excludePersonIds"
    >,
    id: string,
    labelKey: keyof KnownLabels,
    displayLabel: string,
  ) {
    if (value[field].includes(id)) return;
    setDynamicLabels((prev) => ({
      ...prev,
      [labelKey]: { ...prev[labelKey], [id]: displayLabel },
    }));
    patch({ [field]: [...value[field], id] } as Partial<ZielgruppeEditorDefinition>);
  }

  function removeId(
    field: keyof Pick<
      ZielgruppeEditorDefinition,
      "orgUnitIds" | "teamIds" | "roleIds" | "includePersonIds" | "excludePersonIds"
    >,
    id: string,
  ) {
    patch({ [field]: value[field].filter((x) => x !== id) } as Partial<ZielgruppeEditorDefinition>);
  }

  return (
    <div className="space-y-6">
      <p className="text-xs leading-5 text-[var(--text-2)]">
        Kriterien werden als{" "}
        <span className="font-medium text-[var(--foreground)]">Vereinigung (ODER)</span>{" "}
        ausgewertet. Ausgeschlossene Personen haben Vorrang vor Einschlüssen.
      </p>

      <section className="space-y-2">
        <h3 className={SECTION_LABEL}>Organisation</h3>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[var(--border-strong)]"
            checked={value.wholeOrganisation}
            disabled={disabled}
            onChange={(e) => patch({ wholeOrganisation: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-medium text-[var(--foreground)]">
              Ganze Organisation
            </span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              Strukturelle Auswahl des Vereins — Empfänger werden zur Versandzeit dynamisch
              ermittelt (keine Personenliste).
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-2">
        <h3 className={SECTION_LABEL}>Organisationseinheiten</h3>
        <div className="flex flex-wrap gap-2">
          {value.orgUnitIds.map((id) => (
            <ZielgruppeSelectorChip
              key={id}
              label={labels.orgUnits[id] ?? id}
              disabled={disabled}
              onRemove={() => removeId("orgUnitIds", id)}
            />
          ))}
        </div>
        <SearchAddButton
          kind="orgUnit"
          label="Einheit hinzufügen"
          disabled={disabled}
          onPick={(id, label) => addId("orgUnitIds", id, "orgUnits", label)}
        />
      </section>

      <section className="space-y-2">
        <h3 className={SECTION_LABEL}>Teams</h3>
        <p className="text-[11px] text-[var(--muted)]">
          Gespeichert als Team-ID (nicht Saison) — aktive Kader und Trainer der laufenden Saison
          werden bei der Auflösung berücksichtigt.
        </p>
        <div className="flex flex-wrap gap-2">
          {value.teamIds.map((id) => (
            <ZielgruppeSelectorChip
              key={id}
              label={labels.teams[id] ?? id}
              disabled={disabled}
              onRemove={() => removeId("teamIds", id)}
            />
          ))}
        </div>
        <SearchAddButton
          kind="team"
          label="Team hinzufügen"
          disabled={disabled}
          onPick={(id, label) => addId("teamIds", id, "teams", label)}
        />
      </section>

      <section className="space-y-2">
        <h3 className={SECTION_LABEL}>Rollen</h3>
        <div className="flex flex-wrap gap-2">
          {value.roleIds.map((id) => (
            <ZielgruppeSelectorChip
              key={id}
              label={labels.roles[id] ?? id}
              disabled={disabled}
              onRemove={() => removeId("roleIds", id)}
            />
          ))}
        </div>
        <SearchAddButton
          kind="role"
          label="Rolle hinzufügen"
          disabled={disabled}
          onPick={(id, label) => addId("roleIds", id, "roles", label)}
        />
      </section>

      <section className="space-y-2">
        <h3 className={SECTION_LABEL}>Personen einschliessen</h3>
        <div className="flex flex-wrap gap-2">
          {value.includePersonIds.map((id) => (
            <ZielgruppeSelectorChip
              key={id}
              label={labels.persons[id] ?? id}
              disabled={disabled}
              onRemove={() => removeId("includePersonIds", id)}
            />
          ))}
        </div>
        <SearchAddButton
          kind="personInclude"
          label="Person hinzufügen"
          disabled={disabled}
          onPick={(id, label) => addId("includePersonIds", id, "persons", label)}
        />
      </section>

      <section className="space-y-2">
        <h3 className={SECTION_LABEL}>Personen ausschliessen</h3>
        <div className="flex flex-wrap gap-2">
          {value.excludePersonIds.map((id) => (
            <ZielgruppeSelectorChip
              key={id}
              label={labels.persons[id] ?? id}
              disabled={disabled}
              onRemove={() => removeId("excludePersonIds", id)}
            />
          ))}
        </div>
        <SearchAddButton
          kind="personExclude"
          label="Person ausschliessen"
          disabled={disabled}
          onPick={(id, label) => addId("excludePersonIds", id, "persons", label)}
        />
      </section>

      <section
        className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-3"
        aria-label="Empfänger Vorschau Platzhalter"
      >
        <p className="text-xs font-semibold text-[var(--foreground)]">Empfänger (geplant)</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Autoritative Live-Empfängervorschau folgt in COMM-03. Hier werden später aufgelöste
          Empfänger angezeigt.
        </p>
      </section>
    </div>
  );
}

export { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION };
