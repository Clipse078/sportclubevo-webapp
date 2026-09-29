"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, Plus, User, UserCircle2, Users, X } from "lucide-react";
import type { RequirementPersonOption } from "@/lib/requirements/person-search";
import { previewRequirementDraftAudienceAction } from "@/app/(admin)/dashboard/aufgaben/requirement-actions";
import type { RequirementAudienceSelection } from "@/lib/requirements/types";
import {
  normalizeRequirementAudienceSelection,
  requirementAudienceSelectionHasContent,
} from "@/lib/requirements/requirement-audience-selection";
import type {
  RequirementAudienceComposition,
  RequirementAudienceConnector,
  RequirementAudienceTermType,
} from "@/lib/requirements/requirement-audience-composition-model";
import { SceRecipientSelector } from "@/components/sce/recipient/SceRecipientSelector";
import { SCE_RECIPIENT_SELECTOR_REQUIREMENT } from "@/lib/sce/recipient/sce-recipient-selector-config";
import type { SceSelectorPick, SceSelectorSourceType } from "@/lib/sce/list-selector/types";
import { sceSelectorPickKey } from "@/lib/sce/list-selector/types";

export type { RequirementAudienceSelection };

type KnownLabels = {
  teams: Record<string, string>;
  orgUnits: Record<string, string>;
  roles: Record<string, string>;
  targetGroups: Record<string, string>;
};

type StructuralExpansionMeta = Record<string, { personCount?: number }>;

type Props = {
  value: RequirementAudienceSelection;
  onChange: (value: RequirementAudienceSelection) => void;
  knownLabels?: KnownLabels;
  initialKnownPersons?: RequirementPersonOption[];
  disabled?: boolean;
};

function RecipientTypeIcon({ type }: { type: SceSelectorSourceType }) {
  if (type === "ORG_UNIT") return <Building2 className="h-3.5 w-3.5" aria-hidden="true" />;
  if (type === "TEAM" || type === "TARGET_GROUP") {
    return <Users className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (type === "ROLE") return <UserCircle2 className="h-3.5 w-3.5" aria-hidden="true" />;
  return <User className="h-3.5 w-3.5" aria-hidden="true" />;
}

function termKindLabel(type: RequirementAudienceTermType): string {
  if (type === "ORG_UNIT") return "Organisation";
  if (type === "TEAM") return "Team";
  if (type === "ROLE") return "Rolle";
  if (type === "TARGET_GROUP") return "Zielgruppe";
  return "Person";
}

function resolveLabel(
  type: RequirementAudienceTermType,
  id: string,
  labels: KnownLabels,
  knownPersons: Record<string, RequirementPersonOption>,
): string {
  if (type === "PERSON") return knownPersons[id]?.displayName ?? id;
  if (type === "TEAM") return labels.teams[id] ?? id;
  if (type === "ORG_UNIT") return labels.orgUnits[id] ?? id;
  if (type === "ROLE") return labels.roles[id] ?? id;
  return labels.targetGroups[id] ?? id;
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
  const [structuralMeta, setStructuralMeta] = useState<StructuralExpansionMeta>({});
  const [includePickerOpen, setIncludePickerOpen] = useState(false);
  const [excludePickerOpen, setExcludePickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [nextConnector, setNextConnector] = useState<RequirementAudienceConnector>("AND");
  const [knownPersons, setKnownPersons] = useState<Record<string, RequirementPersonOption>>(() => {
    const map: Record<string, RequirementPersonOption> = {};
    for (const person of initialKnownPersons) {
      map[person.personId] = person;
    }
    return map;
  });

  const [preview, setPreview] = useState<{
    resolvedTotal: number;
    persons: Array<{ personId: string; displayName: string; secondary: string | null }>;
    loading: boolean;
    error: string | null;
  }>({ resolvedTotal: 0, persons: [], loading: false, error: null });

  const normalized = useMemo(() => normalizeRequirementAudienceSelection(value), [value]);
  const composition = normalized.composition;

  useEffect(() => {
    if (knownLabels) setLabels(knownLabels);
  }, [knownLabels]);

  useEffect(() => {
    const map: Record<string, RequirementPersonOption> = {};
    for (const person of initialKnownPersons) {
      map[person.personId] = person;
    }
    setKnownPersons((prev) => ({ ...map, ...prev }));
  }, [initialKnownPersons]);

  const hasAudiences = requirementAudienceSelectionHasContent(normalized);

  useEffect(() => {
    if (!hasAudiences) {
      setPreview({ resolvedTotal: 0, persons: [], loading: false, error: null });
      return undefined;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setPreview((prev) => ({ ...prev, loading: true, error: null }));
      const result = await previewRequirementDraftAudienceAction(normalized, {
        includePersonRows: previewOpen,
      });
      if (cancelled) return;
      if (!result.ok) {
        setPreview({ resolvedTotal: 0, persons: [], loading: false, error: result.message });
        return;
      }
      setPreview({
        resolvedTotal: result.preview.resolvedTotal,
        persons: result.preview.persons,
        loading: false,
        error: null,
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [normalized, hasAudiences, previewOpen]);

  function patchComposition(nextComposition: RequirementAudienceComposition | null) {
    onChange(
      normalizeRequirementAudienceSelection({
        ...value,
        composition: nextComposition,
      }),
    );
  }

  function applyIncludePicks(picks: SceSelectorPick[]) {
    if (picks.length === 0) {
      setIncludePickerOpen(false);
      return;
    }

    const base =
      composition ??
      ({
        version: 1,
        conditions: [],
        excludePersonIds: normalized.excludePersonIds,
      } satisfies RequirementAudienceComposition);

    const nextConditions = [...base.conditions];
    const nextLabels = { ...labels };
    const nextKnownPersons = { ...knownPersons };
    const nextStructuralMeta = { ...structuralMeta };

    for (const pick of picks) {
      if (
        pick.type !== "PERSON" &&
        pick.type !== "TEAM" &&
        pick.type !== "ORG_UNIT" &&
        pick.type !== "ROLE" &&
        pick.type !== "TARGET_GROUP"
      ) {
        continue;
      }

      nextConditions.push({
        connector: nextConditions.length === 0 ? undefined : nextConnector,
        term: { type: pick.type, id: pick.id },
      });

      if (pick.type === "PERSON") {
        nextKnownPersons[pick.id] = {
          personId: pick.id,
          firstName: pick.label.split(" ")[0] ?? pick.label,
          lastName: pick.label.split(" ").slice(1).join(" "),
          displayName: pick.label,
          email: pick.description ?? null,
        };
      }
      if (pick.type === "TEAM") {
        nextLabels.teams = { ...nextLabels.teams, [pick.id]: pick.label };
        const count = pick.metadata?.expansionPersonCount;
        if (typeof count === "number") {
          nextStructuralMeta[`TEAM:${pick.id}`] = { personCount: count };
        }
      }
      if (pick.type === "ORG_UNIT") {
        nextLabels.orgUnits = { ...nextLabels.orgUnits, [pick.id]: pick.label };
        const count = pick.metadata?.expansionPersonCount;
        if (typeof count === "number") {
          nextStructuralMeta[`ORG_UNIT:${pick.id}`] = { personCount: count };
        }
      }
      if (pick.type === "ROLE") {
        nextLabels.roles = { ...nextLabels.roles, [pick.id]: pick.label };
        const count = pick.metadata?.expansionPersonCount;
        if (typeof count === "number") {
          nextStructuralMeta[`ROLE:${pick.id}`] = { personCount: count };
        }
      }
      if (pick.type === "TARGET_GROUP") {
        nextLabels.targetGroups = { ...nextLabels.targetGroups, [pick.id]: pick.label };
        const count = pick.metadata?.expansionPersonCount;
        if (typeof count === "number") {
          nextStructuralMeta[`TARGET_GROUP:${pick.id}`] = { personCount: count };
        }
      }
    }

    setLabels(nextLabels);
    setKnownPersons(nextKnownPersons);
    setStructuralMeta(nextStructuralMeta);
    patchComposition({ ...base, conditions: nextConditions });
    setIncludePickerOpen(false);
  }

  function applyExcludePicks(picks: SceSelectorPick[]) {
    const personIds = picks.filter((p) => p.type === "PERSON").map((p) => p.id);
    if (personIds.length === 0) {
      setExcludePickerOpen(false);
      return;
    }

    const base =
      composition ??
      ({
        version: 1,
        conditions: [],
        excludePersonIds: [],
      } satisfies RequirementAudienceComposition);

    const nextKnownPersons = { ...knownPersons };
    for (const pick of picks) {
      if (pick.type !== "PERSON") continue;
      nextKnownPersons[pick.id] = {
        personId: pick.id,
        firstName: pick.label.split(" ")[0] ?? pick.label,
        lastName: pick.label.split(" ").slice(1).join(" "),
        displayName: pick.label,
        email: pick.description ?? null,
      };
    }
    setKnownPersons(nextKnownPersons);

    patchComposition({
      ...base,
      excludePersonIds: [...new Set([...base.excludePersonIds, ...personIds])],
    });
    setExcludePickerOpen(false);
  }

  function removeCondition(index: number) {
    if (!composition) return;
    const next = composition.conditions.filter((_, i) => i !== index);
    if (next.length > 0 && next[0]) {
      next[0] = { ...next[0], connector: undefined };
    }
    patchComposition({ ...composition, conditions: next });
  }

  function setConditionConnector(index: number, connector: RequirementAudienceConnector) {
    if (!composition || index === 0) return;
    const next = composition.conditions.map((row, i) =>
      i === index ? { ...row, connector } : row,
    );
    patchComposition({ ...composition, conditions: next });
  }

  function removeExclude(personId: string) {
    if (!composition) return;
    patchComposition({
      ...composition,
      excludePersonIds: composition.excludePersonIds.filter((id) => id !== personId),
    });
  }

  const committedIncludeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of composition?.conditions ?? []) {
      keys.add(sceSelectorPickKey(row.term.type, row.term.id));
    }
    return keys;
  }, [composition]);

  const committedExcludeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const id of composition?.excludePersonIds ?? []) {
      keys.add(sceSelectorPickKey("PERSON", id));
    }
    return keys;
  }, [composition]);

  const compositionJson = composition ? JSON.stringify(composition) : "";

  return (
    <section className="space-y-4" data-testid="requirement-audience-builder">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Empfänger</h3>
        <p className="mt-0.5 text-xs text-[var(--text-2)]">
          Wer soll die Anforderung bestätigen? Nur Personen bestätigen individuell — Teams,
          Organisationen, Rollen und Zielgruppen legen fest, welche Personen gemeint sind.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/40 p-3">
        {(composition?.conditions ?? []).length === 0 ? (
          <p className="text-xs text-[var(--muted)]">Noch keine Empfängerregeln.</p>
        ) : (
          <ul className="space-y-2">
            {(composition?.conditions ?? []).map((row, index) => {
              const label = resolveLabel(row.term.type, row.term.id, labels, knownPersons);
              const count = structuralMeta[`${row.term.type}:${row.term.id}`]?.personCount;
              return (
                <li key={`${row.term.type}:${row.term.id}:${index}`} className="flex flex-wrap items-center gap-2">
                  {index > 0 ? (
                    <label className="inline-flex items-center gap-1 text-xs text-[var(--text-2)]">
                      <select
                        className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-xs"
                        value={row.connector ?? "OR"}
                        disabled={disabled}
                        onChange={(event) =>
                          setConditionConnector(
                            index,
                            event.target.value === "AND" ? "AND" : "OR",
                          )
                        }
                        data-testid={`requirement-audience-connector-${index}`}
                      >
                        <option value="AND">UND</option>
                        <option value="OR">ODER</option>
                      </select>
                    </label>
                  ) : null}
                  <span
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 py-1 pl-2 pr-1 text-xs"
                    data-testid={`requirement-recipient-chip-${sceSelectorPickKey(row.term.type, row.term.id)}`}
                  >
                    <RecipientTypeIcon type={row.term.type} />
                    <span className="min-w-0 truncate">
                      <span className="font-medium text-[var(--foreground)]">{label}</span>
                      <span className="mx-1 text-[var(--muted)]">·</span>
                      <span className="text-[var(--text-2)]">
                        {termKindLabel(row.term.type)}
                        {typeof count === "number"
                          ? ` · ${count === 1 ? "1 Person" : `${count} Personen`}`
                          : row.term.type !== "PERSON"
                            ? " · erweitert zu Personen"
                            : ""}
                      </span>
                    </span>
                    {!disabled ? (
                      <button
                        type="button"
                        className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-3)]"
                        aria-label={`${label} entfernen`}
                        onClick={() => removeCondition(index)}
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {!disabled ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <label className="inline-flex items-center gap-1 text-xs text-[var(--text-2)]">
              Nächste Bedingung
              <select
                className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-xs"
                value={nextConnector}
                onChange={(event) =>
                  setNextConnector(event.target.value === "OR" ? "OR" : "AND")
                }
                data-testid="requirement-audience-next-connector"
              >
                <option value="AND">UND</option>
                <option value="OR">ODER</option>
              </select>
            </label>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--surface-2)]"
              onClick={() => setIncludePickerOpen(true)}
              data-testid="requirement-recipient-add"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              Empfänger hinzufügen
            </button>
          </div>
        ) : null}
      </div>

      {(composition?.excludePersonIds.length ?? 0) > 0 || !disabled ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-2)]">
            Ausgeschlossen
          </h4>
          <div className="flex flex-wrap gap-2">
            {(composition?.excludePersonIds ?? []).map((personId) => (
              <span
                key={personId}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 py-1 pl-2 pr-1 text-xs"
              >
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{knownPersons[personId]?.displayName ?? personId}</span>
                {!disabled ? (
                  <button
                    type="button"
                    className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-3)]"
                    aria-label="Ausschluss entfernen"
                    onClick={() => removeExclude(personId)}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                ) : null}
              </span>
            ))}
            {!disabled ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--surface-2)]"
                onClick={() => setExcludePickerOpen(true)}
                data-testid="requirement-audience-exclude-add"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                Ausschluss
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasAudiences ? (
        <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-[var(--text-2)]">Ergebnis</p>
              <p className="text-sm font-semibold text-[var(--foreground)]" data-testid="requirement-audience-preview">
                {preview.loading
                  ? "Empfänger werden berechnet…"
                  : preview.error
                    ? preview.error
                    : preview.resolvedTotal === 0
                      ? "Diese Auswahl enthält aktuell keine Personen."
                      : `${preview.resolvedTotal} Personen`}
              </p>
              {!preview.loading && !preview.error && preview.resolvedTotal > 0 ? (
                <p className="text-xs text-[var(--text-2)]">
                  {preview.resolvedTotal === 1
                    ? "1 Person muss diese Anforderung individuell bestätigen."
                    : `${preview.resolvedTotal} Personen müssen diese Anforderung individuell bestätigen.`}
                </p>
              ) : null}
            </div>
            {!preview.loading && !preview.error && preview.resolvedTotal > 0 ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)]"
                onClick={() => setPreviewOpen((open) => !open)}
                data-testid="requirement-audience-preview-toggle"
              >
                {preview.resolvedTotal} Personen anzeigen
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${previewOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </div>
          {previewOpen && preview.persons.length > 0 ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm" data-testid="requirement-audience-preview-list">
              {preview.persons.map((person) => (
                <li key={person.personId} className="flex justify-between gap-2 border-t border-[var(--border)]/60 pt-1">
                  <span>{person.displayName}</span>
                  {person.secondary ? (
                    <span className="truncate text-xs text-[var(--muted)]">{person.secondary}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <SceRecipientSelector
        profile={SCE_RECIPIENT_SELECTOR_REQUIREMENT}
        open={includePickerOpen}
        onOpenChange={setIncludePickerOpen}
        mode="multiple"
        committedKeys={committedIncludeKeys}
        onConfirm={applyIncludePicks}
        disabled={disabled}
        testIdPrefix="requirement-recipient-selector"
      />

      <SceRecipientSelector
        profile={{
          ...SCE_RECIPIENT_SELECTOR_REQUIREMENT,
          sourceTypes: ["PERSON"],
          dialogTitle: "Person ausschliessen",
          dialogDescription: "Diese Person soll die Anforderung nicht erhalten.",
          addButtonLabel: "Ausschluss hinzufügen",
        }}
        open={excludePickerOpen}
        onOpenChange={setExcludePickerOpen}
        mode="multiple"
        committedKeys={committedExcludeKeys}
        onConfirm={applyExcludePicks}
        disabled={disabled}
        testIdPrefix="requirement-exclude-selector"
      />

      <input type="hidden" name="audiencePersonIds" value={normalized.personIds.join(",")} />
      <input type="hidden" name="audienceTeamIds" value={normalized.teamIds.join(",")} />
      <input type="hidden" name="audienceOrgUnitIds" value={normalized.orgUnitIds.join(",")} />
      <input type="hidden" name="audienceRoleIds" value={normalized.roleIds.join(",")} />
      <input type="hidden" name="audienceTargetGroupIds" value={normalized.targetGroupIds.join(",")} />
      <input type="hidden" name="audienceExcludePersonIds" value={normalized.excludePersonIds.join(",")} />
      <input type="hidden" name="audienceCompositionJson" value={compositionJson} />
    </section>
  );
}
