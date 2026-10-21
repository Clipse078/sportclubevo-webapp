"use client";

import type { ReactNode } from "react";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import {
  normalizeRequirementAudienceSelection,
} from "@/lib/requirements/requirement-audience-selection";
import type { RequirementAudienceSelection } from "@/lib/requirements/types";
import TaskDescriptionFormField from "./TaskDescriptionFormField";
import RequirementAudienceBuilder from "./RequirementAudienceBuilder";
import { TaskReminderFields } from "./TaskReminderFields";

export type RequirementCreateFormProps = {
  timeZone: string;
  pending: boolean;
  error: ReactNode;
  audience: RequirementAudienceSelection;
  onAudienceChange: (next: RequirementAudienceSelection) => void;
  formId: string;
  onSubmit: (formData: FormData) => void;
};

export function RequirementCreateForm({
  timeZone,
  pending,
  error,
  audience,
  onAudienceChange,
  formId,
  onSubmit,
}: RequirementCreateFormProps) {
  return (
    <div className="space-y-5" data-requirement-create-form="true">
      {error}
      <form
        id={formId}
        action={onSubmit}
        className="space-y-5"
        data-testid="requirement-create-form"
      >
        <SceFormField label="Titel" required density="DENSE">
          <input
            name="title"
            required
            disabled={pending}
            className="fca-input w-full text-sm"
            placeholder="Trainershandbuch 2026/27 bestätigen"
            data-testid="requirement-create-title"
          />
        </SceFormField>
        <TaskDescriptionFormField name="description" disabled={pending} compact />
        <div className="grid gap-4 md:grid-cols-2">
          <SceFormField
            label="Fällig am"
            required
            description="Für Anforderungen wird ein Termin benötigt, um offene und überfällige Bestätigungen nachzuverfolgen."
            density="DENSE"
          >
            <input
              type="date"
              name="dueAt"
              required
              disabled={pending}
              className="fca-input w-full text-sm"
              data-testid="requirement-create-due"
            />
          </SceFormField>
          <TaskReminderFields
            timeZone={timeZone}
            disabled={pending}
            values={{
              reminder1PresetKey: null,
              reminder2PresetKey: null,
              reminder1At: null,
              reminder2At: null,
            }}
          />
        </div>
        <RequirementAudienceBuilder value={audience} onChange={onAudienceChange} disabled={pending} />
      </form>
    </div>
  );
}

export function appendRequirementAudienceToFormData(
  formData: FormData,
  audience: RequirementAudienceSelection,
): void {
  const normalized = normalizeRequirementAudienceSelection(audience);
  formData.set("audiencePersonIds", normalized.personIds.join(","));
  formData.set("audienceTeamIds", normalized.teamIds.join(","));
  formData.set("audienceOrgUnitIds", normalized.orgUnitIds.join(","));
  formData.set("audienceRoleIds", normalized.roleIds.join(","));
  formData.set("audienceTargetGroupIds", normalized.targetGroupIds.join(","));
  formData.set("audienceExcludePersonIds", normalized.excludePersonIds.join(","));
  formData.set(
    "audienceCompositionJson",
    normalized.composition ? JSON.stringify(normalized.composition) : "",
  );
}
