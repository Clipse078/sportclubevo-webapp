"use client";

import { useMemo, useState } from "react";
import type { TaskVisibilityScope } from "@prisma/client";
import {
  TASK_VISIBILITY_SCOPE_DESCRIPTIONS,
  TASK_VISIBILITY_SCOPE_LABELS,
} from "@/lib/tasks/management-labels";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";

type Props = {
  orgUnitOptions: TaskOrgUnitPickerOption[];
  defaultOrgUnitId?: string | null;
  defaultVisibilityScope?: TaskVisibilityScope;
  disabled?: boolean;
  showSectionHeading?: boolean;
};

const VISIBILITY_OPTIONS: TaskVisibilityScope[] = [
  "CLUB",
  "ORG_UNIT",
  "ASSIGNEES_ONLY",
];

function formatOrgUnitLabel(option: TaskOrgUnitPickerOption): string {
  const indent = option.level > 0 ? `${"  ".repeat(option.level)}↳ ` : "";
  return `${indent}${option.label}`;
}

export default function TaskOrgVisibilityFields({
  orgUnitOptions,
  defaultOrgUnitId = null,
  defaultVisibilityScope = "CLUB",
  disabled = false,
  showSectionHeading = true,
}: Props) {
  const [visibilityScope, setVisibilityScope] =
    useState<TaskVisibilityScope>(defaultVisibilityScope);
  const [orgUnitId, setOrgUnitId] = useState(defaultOrgUnitId ?? "");

  const requiresOrgUnit = visibilityScope === "ORG_UNIT";
  const description = TASK_VISIBILITY_SCOPE_DESCRIPTIONS[visibilityScope];

  const sortedOptions = useMemo(
    () => [...orgUnitOptions].sort((a, b) => a.level - b.level || a.label.localeCompare(b.label, "de")),
    [orgUnitOptions],
  );

  return (
    <fieldset className="space-y-3" disabled={disabled} data-testid="task-org-visibility-fields">
      {showSectionHeading ? (
        <legend className="text-xs font-semibold text-[var(--foreground)]">
          Organisation &amp; Sichtbarkeit
        </legend>
      ) : null}

      <label className="block space-y-1">
        <span className="text-xs font-medium text-[var(--text-2)]">Sichtbarkeit</span>
        <select
          name="visibilityScope"
          className="fca-input w-full text-sm"
          value={visibilityScope}
          onChange={(e) => setVisibilityScope(e.target.value as TaskVisibilityScope)}
          data-testid="task-visibility-select"
        >
          {VISIBILITY_OPTIONS.map((scope) => (
            <option key={scope} value={scope}>
              {TASK_VISIBILITY_SCOPE_LABELS[scope]}
            </option>
          ))}
        </select>
        <p className="text-[0.6875rem] leading-snug text-[var(--muted)]">{description}</p>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-[var(--text-2)]">Organisation</span>
        <select
          name="orgUnitId"
          className="fca-input w-full text-sm"
          value={orgUnitId}
          onChange={(e) => setOrgUnitId(e.target.value)}
          data-testid="task-org-unit-select"
        >
          <option value="">Keine Zuordnung</option>
          {sortedOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {formatOrgUnitLabel(option)}
            </option>
          ))}
        </select>
      </label>

      {requiresOrgUnit && !orgUnitId ? (
        <p className="text-xs text-amber-300" data-testid="task-org-unit-required-hint">
          Bitte eine Organisationseinheit wählen.
        </p>
      ) : null}
    </fieldset>
  );
}
