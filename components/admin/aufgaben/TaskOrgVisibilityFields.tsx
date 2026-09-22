"use client";

import { useEffect, useMemo, useState } from "react";
import type { TaskVisibilityScope } from "@prisma/client";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import {
  TASK_VISIBILITY_SCOPE_DESCRIPTIONS,
  TASK_VISIBILITY_SCOPE_LABELS,
} from "@/lib/tasks/management-labels";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import TaskOrgUnitMultiPicker from "./TaskOrgUnitMultiPicker";
import TaskPeopleMultiPicker from "./TaskPeopleMultiPicker";

type Props = {
  orgUnitOptions: TaskOrgUnitPickerOption[];
  defaultOrgUnitGrantIds?: string[];
  defaultViewerUserGrantIds?: string[];
  defaultOrgUnitId?: string | null;
  defaultVisibilityScope?: TaskVisibilityScope;
  defaultViewerPeople?: TaskAssigneeOption[];
  disabled?: boolean;
  showSectionHeading?: boolean;
};

const VISIBILITY_OPTIONS: TaskVisibilityScope[] = [
  "CLUB",
  "ORG_UNIT",
  "ASSIGNEES_ONLY",
];

export default function TaskOrgVisibilityFields({
  orgUnitOptions,
  defaultOrgUnitGrantIds = [],
  defaultViewerUserGrantIds = [],
  defaultOrgUnitId = null,
  defaultVisibilityScope = "CLUB",
  defaultViewerPeople = [],
  disabled = false,
  showSectionHeading = true,
}: Props) {
  const initialOrgGrants = useMemo(() => {
    if (defaultOrgUnitGrantIds.length > 0) return defaultOrgUnitGrantIds;
    return defaultOrgUnitId ? [defaultOrgUnitId] : [];
  }, [defaultOrgUnitGrantIds, defaultOrgUnitId]);

  const [visibilityScope, setVisibilityScope] =
    useState<TaskVisibilityScope>(defaultVisibilityScope);
  const [orgUnitGrantIds, setOrgUnitGrantIds] = useState<string[]>(initialOrgGrants);
  const [viewerUserGrantIds, setViewerUserGrantIds] = useState<string[]>(
    defaultViewerUserGrantIds,
  );

  useEffect(() => {
    setOrgUnitGrantIds(initialOrgGrants);
  }, [initialOrgGrants]);

  const requiresOrgUnits = visibilityScope === "ORG_UNIT";
  const description = TASK_VISIBILITY_SCOPE_DESCRIPTIONS[visibilityScope];
  const primaryOrgUnitId = orgUnitGrantIds[0] ?? "";

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

      {visibilityScope === "ORG_UNIT" ? (
        <div className="space-y-1">
          <span className="text-xs font-medium text-[var(--text-2)]">Organisationseinheiten</span>
          <TaskOrgUnitMultiPicker
            fieldName="orgUnitGrantIds"
            options={orgUnitOptions}
            selectedIds={orgUnitGrantIds}
            onSelectedIdsChange={setOrgUnitGrantIds}
            disabled={disabled}
          />
          {requiresOrgUnits && orgUnitGrantIds.length === 0 ? (
            <p className="text-xs text-amber-300" data-testid="task-org-unit-required-hint">
              Bitte mindestens eine Organisationseinheit wählen.
            </p>
          ) : null}
        </div>
      ) : null}

      {visibilityScope === "ASSIGNEES_ONLY" ? (
        <TaskPeopleMultiPicker
          label="Sichtbar für"
          fieldName="viewerUserGrantIds"
          selectedIds={viewerUserGrantIds}
          onSelectedIdsChange={setViewerUserGrantIds}
          disabled={disabled}
          addButtonLabel="Person hinzufügen"
          testIdPrefix="task-viewer-people-picker"
          initialKnown={defaultViewerPeople}
        />
      ) : (
        <input type="hidden" name="viewerUserGrantIds" value="" />
      )}

      <input type="hidden" name="orgUnitId" value={primaryOrgUnitId} />
      {visibilityScope !== "ORG_UNIT" ? (
        <input type="hidden" name="orgUnitGrantIds" value="" />
      ) : null}
    </fieldset>
  );
}
