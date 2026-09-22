"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import RequirementPersonMultiPicker from "./RequirementPersonMultiPicker";
import type { RequirementPersonOption } from "@/lib/requirements/person-search";
import {
  previewRequirementDraftAudienceAction,
  searchRequirementAudienceOrgUnitsAction,
  searchRequirementAudienceRolesAction,
  searchRequirementAudienceTargetGroupsAction,
  searchRequirementAudienceTeamsAction,
} from "@/app/(admin)/dashboard/aufgaben/requirement-actions";
import { REQUIREMENT_PERSON_SEARCH_MIN_CHARS } from "@/lib/requirements/person-search-constants";

import type { RequirementAudienceSelection } from "@/lib/requirements/types";

export type { RequirementAudienceSelection };

type KnownLabels = {
  teams: Record<string, string>;
  orgUnits: Record<string, string>;
  roles: Record<string, string>;
  targetGroups: Record<string, string>;
};

type Props = {
  value: RequirementAudienceSelection;
  onChange: (value: RequirementAudienceSelection) => void;
  knownLabels?: KnownLabels;
  initialKnownPersons?: RequirementPersonOption[];
  disabled?: boolean;
};

type SelectorKind = "team" | "orgUnit" | "role" | "targetGroup";

const KIND_LABEL: Record<SelectorKind, string> = {
  team: "Team",
  orgUnit: "Organisationseinheit",
  role: "Rolle",
  targetGroup: "Zielgruppe",
};

function SelectorAddPanel({
  kind,
  disabled,
  onPick,
}: {
  kind: SelectorKind;
  disabled?: boolean;
  onPick: (id: string, label: string) => void;
}) {
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
        kind === "team"
          ? searchRequirementAudienceTeamsAction
          : kind === "orgUnit"
            ? searchRequirementAudienceOrgUnitsAction
            : kind === "role"
              ? searchRequirementAudienceRolesAction
              : searchRequirementAudienceTargetGroupsAction;
      const result = await searchFn(term);
      if (!result.ok) {
        setError(result.message);
        setOptions([]);
      } else {
        setOptions(
          result.options.map((row) => ({
            id:
              "teamId" in row
                ? row.teamId
                : "orgUnitId" in row
                  ? row.orgUnitId
                  : "roleId" in row
                    ? row.roleId
                    : row.targetGroupId,
            label: row.label,
          })),
        );
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [kind, open, query]);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--surface-2)]"
        onClick={() => setOpen((v) => !v)}
        data-testid={`requirement-audience-add-${kind}`}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {KIND_LABEL[kind]}
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
          <input
            className="fca-input mb-2 w-full text-sm"
            placeholder="Suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid={`requirement-audience-search-${kind}`}
          />
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
          {loading ? <p className="text-xs text-[var(--muted)]">Suche…</p> : null}
          <ul className="max-h-48 overflow-y-auto">
            {options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]"
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
        </div>
      ) : null}
    </div>
  );
}

function TokenRow({
  typeLabel,
  valueLabel,
  onRemove,
  disabled,
  testId,
}: {
  typeLabel: string;
  valueLabel: string;
  onRemove: () => void;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
      data-testid={testId}
    >
      <div className="min-w-0">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {typeLabel}
        </span>
        <p className="truncate">{valueLabel}</p>
      </div>
      <button
        type="button"
        className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface)]"
        aria-label={`${typeLabel} ${valueLabel} entfernen`}
        disabled={disabled}
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function RequirementAudienceBuilder({
  value,
  onChange,
  knownLabels,
  initialKnownPersons = [],
  disabled,
}: Props) {
  const [labels, setLabels] = useState<KnownLabels>(
    knownLabels ?? { teams: {}, orgUnits: {}, roles: {}, targetGroups: {} },
  );
  const [preview, setPreview] = useState<{
    resolvedTotal: number;
    loading: boolean;
    error: string | null;
  }>({ resolvedTotal: 0, loading: false, error: null });

  useEffect(() => {
    if (knownLabels) setLabels(knownLabels);
  }, [knownLabels]);

  const hasAudiences = useMemo(
    () =>
      value.personIds.length +
        value.teamIds.length +
        value.orgUnitIds.length +
        value.roleIds.length +
        value.targetGroupIds.length >
      0,
    [value],
  );

  useEffect(() => {
    if (!hasAudiences) {
      setPreview({ resolvedTotal: 0, loading: false, error: null });
      return undefined;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setPreview((prev) => ({ ...prev, loading: true, error: null }));
      const result = await previewRequirementDraftAudienceAction(value);
      if (cancelled) return;
      if (!result.ok) {
        setPreview({ resolvedTotal: 0, loading: false, error: result.message });
        return;
      }
      setPreview({
        resolvedTotal: result.preview.resolvedTotal,
        loading: false,
        error: null,
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [value, hasAudiences]);

  function addToken(kind: SelectorKind, id: string, label: string) {
    if (kind === "team" && !value.teamIds.includes(id)) {
      setLabels((prev) => ({ ...prev, teams: { ...prev.teams, [id]: label } }));
      onChange({ ...value, teamIds: [...value.teamIds, id] });
    }
    if (kind === "orgUnit" && !value.orgUnitIds.includes(id)) {
      setLabels((prev) => ({ ...prev, orgUnits: { ...prev.orgUnits, [id]: label } }));
      onChange({ ...value, orgUnitIds: [...value.orgUnitIds, id] });
    }
    if (kind === "role" && !value.roleIds.includes(id)) {
      setLabels((prev) => ({ ...prev, roles: { ...prev.roles, [id]: label } }));
      onChange({ ...value, roleIds: [...value.roleIds, id] });
    }
    if (kind === "targetGroup" && !value.targetGroupIds.includes(id)) {
      setLabels((prev) => ({ ...prev, targetGroups: { ...prev.targetGroups, [id]: label } }));
      onChange({ ...value, targetGroupIds: [...value.targetGroupIds, id] });
    }
  }

  return (
    <section className="space-y-3" data-testid="requirement-audience-builder">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Empfänger</h3>
        <p className="mt-0.5 text-xs text-[var(--text-2)]">
          Empfänger werden beim Aktivieren als Snapshot festgelegt.
        </p>
      </div>

      <RequirementPersonMultiPicker
        selectedIds={value.personIds}
        onSelectedIdsChange={(personIds) => onChange({ ...value, personIds })}
        disabled={disabled}
        initialKnown={initialKnownPersons}
      />

      <div className="flex flex-wrap gap-2">
        <SelectorAddPanel kind="team" disabled={disabled} onPick={(id, label) => addToken("team", id, label)} />
        <SelectorAddPanel
          kind="orgUnit"
          disabled={disabled}
          onPick={(id, label) => addToken("orgUnit", id, label)}
        />
        <SelectorAddPanel kind="role" disabled={disabled} onPick={(id, label) => addToken("role", id, label)} />
        <SelectorAddPanel
          kind="targetGroup"
          disabled={disabled}
          onPick={(id, label) => addToken("targetGroup", id, label)}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {value.teamIds.map((id) => (
          <TokenRow
            key={`team-${id}`}
            typeLabel="Team"
            valueLabel={labels.teams[id] ?? id}
            disabled={disabled}
            testId={`requirement-audience-token-team-${id}`}
            onRemove={() =>
              onChange({ ...value, teamIds: value.teamIds.filter((entry) => entry !== id) })
            }
          />
        ))}
        {value.orgUnitIds.map((id) => (
          <TokenRow
            key={`org-${id}`}
            typeLabel="Organisationseinheit"
            valueLabel={labels.orgUnits[id] ?? id}
            disabled={disabled}
            testId={`requirement-audience-token-org-${id}`}
            onRemove={() =>
              onChange({ ...value, orgUnitIds: value.orgUnitIds.filter((entry) => entry !== id) })
            }
          />
        ))}
        {value.roleIds.map((id) => (
          <TokenRow
            key={`role-${id}`}
            typeLabel="Rolle"
            valueLabel={labels.roles[id] ?? id}
            disabled={disabled}
            testId={`requirement-audience-token-role-${id}`}
            onRemove={() =>
              onChange({ ...value, roleIds: value.roleIds.filter((entry) => entry !== id) })
            }
          />
        ))}
        {value.targetGroupIds.map((id) => (
          <TokenRow
            key={`tg-${id}`}
            typeLabel="Zielgruppe"
            valueLabel={labels.targetGroups[id] ?? id}
            disabled={disabled}
            testId={`requirement-audience-token-target-group-${id}`}
            onRemove={() =>
              onChange({
                ...value,
                targetGroupIds: value.targetGroupIds.filter((entry) => entry !== id),
              })
            }
          />
        ))}
      </div>

      {hasAudiences ? (
        <p className="text-sm text-[var(--text-2)]" data-testid="requirement-audience-preview">
          {preview.loading
            ? "Empfänger werden berechnet…"
            : preview.error
              ? preview.error
              : `${preview.resolvedTotal} Personen (dedupliziert)`}
        </p>
      ) : null}

      <input type="hidden" name="audiencePersonIds" value={value.personIds.join(",")} />
      <input type="hidden" name="audienceTeamIds" value={value.teamIds.join(",")} />
      <input type="hidden" name="audienceOrgUnitIds" value={value.orgUnitIds.join(",")} />
      <input type="hidden" name="audienceRoleIds" value={value.roleIds.join(",")} />
      <input type="hidden" name="audienceTargetGroupIds" value={value.targetGroupIds.join(",")} />
    </section>
  );
}
