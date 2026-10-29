"use client";

import { useMemo, useState } from "react";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import {
  SceChipMultiSelectorField,
  type SceChipSelection,
} from "@/components/sce/list-selector/SceChipMultiSelectorField";
import { clubEventOrganisationalAudienceEditorToApiPayload } from "@/lib/events/club-event-organisational-audience-api";
import type {
  ClubEventOrganisationalAudienceDto,
  ClubEventOrganisationalAudienceEditorValue,
} from "@/lib/events/club-event-organisational-audience-types";

export type { ClubEventOrganisationalAudienceEditorValue };
export { clubEventOrganisationalAudienceEditorToApiPayload };
import type { SceSelectorPick } from "@/lib/sce/list-selector/types";
import { sceSelectorPickKey } from "@/lib/sce/list-selector/types";

type Props = {
  initial: ClubEventOrganisationalAudienceDto;
  disabled?: boolean;
  onChange: (value: ClubEventOrganisationalAudienceEditorValue) => void;
  /** Use embedded selector inside Activity Composer (no nested Sheet). */
  composerSafeSelector?: boolean;
};

function targetPickKey(kind: "TEAM" | "ORG_UNIT", id: string): string {
  return sceSelectorPickKey(kind, id);
}

function parsePickKey(key: string): { kind: "TEAM" | "ORG_UNIT"; id: string } | null {
  const idx = key.indexOf(":");
  if (idx <= 0) return null;
  const kind = key.slice(0, idx);
  const id = key.slice(idx + 1);
  if (kind !== "TEAM" && kind !== "ORG_UNIT") return null;
  if (!id) return null;
  return { kind, id };
}

export default function ClubEventOrganisationalAudienceEditor({
  initial,
  disabled = false,
  onChange,
  composerSafeSelector = false,
}: Props) {
  const [scope, setScope] = useState<"CLUB_WIDE" | "SELECTED_ORG_UNITS">(initial.scope);
  const [targets, setTargets] = useState(initial.targets);

  const selectedKeys = useMemo(
    () => targets.map((t) => targetPickKey(t.kind, t.id)),
    [targets],
  );

  const chips: SceChipSelection[] = useMemo(
    () =>
      targets.map((t) => ({
        id: targetPickKey(t.kind, t.id),
        label: t.label,
        description: t.kind === "TEAM" ? "Team" : "Organisationseinheit",
      })),
    [targets],
  );

  function emit(nextScope: typeof scope, nextTargets: typeof targets) {
    onChange({ scope: nextScope, targets: nextTargets });
  }

  function handleScopeChange(nextScope: "CLUB_WIDE" | "SELECTED_ORG_UNITS") {
    setScope(nextScope);
    if (nextScope === "CLUB_WIDE") {
      emit(nextScope, []);
      return;
    }
    emit(nextScope, targets);
  }

  function handleKeysChange(keys: string[]) {
    const next = keys
      .map((key) => {
        const parsed = parsePickKey(key);
        if (!parsed) return null;
        const existing = targets.find((t) => t.kind === parsed.kind && t.id === parsed.id);
        return existing ?? { kind: parsed.kind, id: parsed.id, label: parsed.id };
      })
      .filter(Boolean) as ClubEventOrganisationalAudienceEditorValue["targets"];
    setTargets(next);
    emit(scope, next);
  }

  function handleSelectionKnown(entries: SceChipSelection[], picks?: SceSelectorPick[]) {
    if (!picks?.length) return;
    const next = [...targets];
    for (const pick of picks) {
      if (pick.type !== "TEAM" && pick.type !== "ORG_UNIT") continue;
      if (next.some((t) => t.kind === pick.type && t.id === pick.id)) continue;
      next.push({
        kind: pick.type,
        id: pick.id,
        label: pick.label.trim(),
      });
    }
    setTargets(next);
    emit(scope, next);
    void entries;
  }

  const validationError =
    scope === "SELECTED_ORG_UNITS" && targets.length === 0
      ? "Mindestens eine Organisationseinheit oder ein Team ist erforderlich."
      : null;

  return (
    <div className="space-y-3" data-testid="club-event-organisational-audience-editor">
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-2)]">
          Gültig für
        </span>
        <SceSegmentedControl<"CLUB_WIDE" | "SELECTED_ORG_UNITS">
          value={scope}
          onChange={handleScopeChange}
          disabled={disabled}
          options={[
            { value: "CLUB_WIDE", label: "Gesamter Verein" },
            { value: "SELECTED_ORG_UNITS", label: "Ausgewählte Organisationseinheiten" },
          ]}
          aria-label="Gültig für"
          testId="club-event-organisational-audience-scope"
        />
      </div>

      {scope === "SELECTED_ORG_UNITS" ? (
        <SceChipMultiSelectorField
          label="Organisationseinheiten und Teams"
          selected={chips}
          selectedIds={selectedKeys}
          onSelectedIdsChange={handleKeysChange}
          onSelectionKnown={handleSelectionKnown}
          authContext="CLUB_EVENT_ORGANISATIONAL_AUDIENCE"
          sourceTypes={["TEAM", "ORG_UNIT"]}
          mapPickToId={(pick) =>
            pick.type === "TEAM" || pick.type === "ORG_UNIT"
              ? targetPickKey(pick.type, pick.id)
              : null
          }
          mapPickToChip={(pick) => {
            const kind = pick.type === "TEAM" || pick.type === "ORG_UNIT" ? pick.type : "ORG_UNIT";
            return {
              id: targetPickKey(kind, pick.id),
              label: pick.label,
              description: kind === "TEAM" ? "Team" : "Organisationseinheit",
            };
          }}
          disabled={disabled}
          addButtonLabel="Organisationseinheit hinzufügen"
          dialogTitle="Organisationseinheiten und Teams"
          dialogDescription="Wählen Sie die Zielgruppe, für die diese Veranstaltung gilt."
          testIdPrefix="club-event-organisational-audience-targets"
          committedPickKeys={new Set(selectedKeys)}
          panelHost={composerSafeSelector ? "embedded" : "sheet"}
        />
      ) : null}

      {validationError ? (
        <p className="text-xs text-rose-600" role="alert" data-testid="club-event-organisational-audience-error">
          {validationError}
        </p>
      ) : null}
    </div>
  );
}
