"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, User, UserCircle2, Users, X } from "lucide-react";
import type { RequirementPersonOption } from "@/lib/requirements/person-search";
import { previewRequirementDraftAudienceAction } from "@/app/(admin)/dashboard/aufgaben/requirement-actions";
import type { RequirementAudienceSelection } from "@/lib/requirements/types";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [knownPersons, setKnownPersons] = useState<Record<string, RequirementPersonOption>>(() => {
    const map: Record<string, RequirementPersonOption> = {};
    for (const person of initialKnownPersons) {
      map[person.personId] = person;
    }
    return map;
  });

  const [preview, setPreview] = useState<{
    resolvedTotal: number;
    loading: boolean;
    error: string | null;
  }>({ resolvedTotal: 0, loading: false, error: null });

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

  const committedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const id of value.personIds) keys.add(sceSelectorPickKey("PERSON", id));
    for (const id of value.teamIds) keys.add(sceSelectorPickKey("TEAM", id));
    for (const id of value.orgUnitIds) keys.add(sceSelectorPickKey("ORG_UNIT", id));
    for (const id of value.roleIds) keys.add(sceSelectorPickKey("ROLE", id));
    for (const id of value.targetGroupIds) keys.add(sceSelectorPickKey("TARGET_GROUP", id));
    return keys;
  }, [value]);

  const recipientChips = useMemo(() => {
    const chips: Array<{ key: string; type: SceSelectorSourceType; label: string; secondary: string; onRemove: () => void }> =
      [];
    for (const id of value.personIds) {
      const known = knownPersons[id];
      chips.push({
        key: sceSelectorPickKey("PERSON", id),
        type: "PERSON",
        label: known?.displayName ?? id,
        secondary: known?.email?.trim() || "Person",
        onRemove: () => onChange({ ...value, personIds: value.personIds.filter((x) => x !== id) }),
      });
    }
    for (const id of value.teamIds) {
      chips.push({
        key: sceSelectorPickKey("TEAM", id),
        type: "TEAM",
        label: labels.teams[id] ?? id,
        secondary: "Team",
        onRemove: () => onChange({ ...value, teamIds: value.teamIds.filter((x) => x !== id) }),
      });
    }
    for (const id of value.orgUnitIds) {
      chips.push({
        key: sceSelectorPickKey("ORG_UNIT", id),
        type: "ORG_UNIT",
        label: labels.orgUnits[id] ?? id,
        secondary: "Organisationseinheit",
        onRemove: () => onChange({ ...value, orgUnitIds: value.orgUnitIds.filter((x) => x !== id) }),
      });
    }
    for (const id of value.roleIds) {
      chips.push({
        key: sceSelectorPickKey("ROLE", id),
        type: "ROLE",
        label: labels.roles[id] ?? id,
        secondary: "Rolle",
        onRemove: () => onChange({ ...value, roleIds: value.roleIds.filter((x) => x !== id) }),
      });
    }
    for (const id of value.targetGroupIds) {
      chips.push({
        key: sceSelectorPickKey("TARGET_GROUP", id),
        type: "TARGET_GROUP",
        label: labels.targetGroups[id] ?? id,
        secondary: "Zielgruppe",
        onRemove: () =>
          onChange({ ...value, targetGroupIds: value.targetGroupIds.filter((x) => x !== id) }),
      });
    }
    return chips;
  }, [knownPersons, labels, onChange, value]);

  const hasAudiences = recipientChips.length > 0;

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

  function applyPicks(picks: SceSelectorPick[]) {
    let next = { ...value };
    const nextLabels = { ...labels };
    const nextKnownPersons = { ...knownPersons };

    for (const pick of picks) {
      if (pick.type === "PERSON" && !next.personIds.includes(pick.id)) {
        next = { ...next, personIds: [...next.personIds, pick.id] };
        nextKnownPersons[pick.id] = {
          personId: pick.id,
          firstName: pick.label.split(" ")[0] ?? pick.label,
          lastName: pick.label.split(" ").slice(1).join(" "),
          displayName: pick.label,
          email: pick.description ?? null,
        };
      }
      if (pick.type === "TEAM" && !next.teamIds.includes(pick.id)) {
        next = { ...next, teamIds: [...next.teamIds, pick.id] };
        nextLabels.teams = { ...nextLabels.teams, [pick.id]: pick.label };
      }
      if (pick.type === "ORG_UNIT" && !next.orgUnitIds.includes(pick.id)) {
        next = { ...next, orgUnitIds: [...next.orgUnitIds, pick.id] };
        nextLabels.orgUnits = { ...nextLabels.orgUnits, [pick.id]: pick.label };
      }
      if (pick.type === "ROLE" && !next.roleIds.includes(pick.id)) {
        next = { ...next, roleIds: [...next.roleIds, pick.id] };
        nextLabels.roles = { ...nextLabels.roles, [pick.id]: pick.label };
      }
      if (pick.type === "TARGET_GROUP" && !next.targetGroupIds.includes(pick.id)) {
        next = { ...next, targetGroupIds: [...next.targetGroupIds, pick.id] };
        nextLabels.targetGroups = { ...nextLabels.targetGroups, [pick.id]: pick.label };
      }
    }

    setLabels(nextLabels);
    setKnownPersons(nextKnownPersons);
    onChange(next);
    setPickerOpen(false);
  }

  return (
    <section className="space-y-3" data-testid="requirement-audience-builder">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Empfänger</h3>
        <p className="mt-0.5 text-xs text-[var(--text-2)]">
          Empfänger werden beim Aktivieren als Snapshot festgelegt.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {recipientChips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 py-1 pl-2 pr-1 text-xs"
            data-testid={`requirement-recipient-chip-${chip.key}`}
          >
            <RecipientTypeIcon type={chip.type} />
            <span className="min-w-0 truncate">
              <span className="font-medium text-[var(--foreground)]">{chip.label}</span>
              <span className="mx-1 text-[var(--muted)]">·</span>
              <span className="text-[var(--text-2)]">{chip.secondary}</span>
            </span>
            {!disabled ? (
              <button
                type="button"
                className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-3)]"
                aria-label={`${chip.label} entfernen`}
                onClick={chip.onRemove}
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
            onClick={() => setPickerOpen(true)}
            data-testid="requirement-recipient-add"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Empfänger hinzufügen
          </button>
        ) : null}
      </div>

      <SceRecipientSelector
        profile={SCE_RECIPIENT_SELECTOR_REQUIREMENT}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode="multiple"
        committedKeys={committedKeys}
        onConfirm={applyPicks}
        disabled={disabled}
        testIdPrefix="requirement-recipient-selector"
      />

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
