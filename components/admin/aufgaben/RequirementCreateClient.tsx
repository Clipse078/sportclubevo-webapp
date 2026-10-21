"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";
import { buildAufgabenBereichHref } from "@/lib/personal-actions/aufgaben-scope";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { SceSemanticFeedback } from "@/components/sce/feedback/SceSemanticFeedback";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { requirementDetailHref } from "@/lib/requirements/management-navigation";
import {
  emptyRequirementAudienceSelection,
  normalizeRequirementAudienceSelection,
} from "@/lib/requirements/requirement-audience-selection";
import type { RequirementAudienceSelection } from "@/lib/requirements/types";
import TaskDescriptionFormField from "./TaskDescriptionFormField";
import RequirementAudienceBuilder from "./RequirementAudienceBuilder";
import { TaskReminderFields } from "./TaskReminderFields";
import { createRequirementDraftAction } from "@/app/(admin)/dashboard/aufgaben/requirement-actions";

type Props = {
  timeZone: string;
};

export default function RequirementCreateClient({ timeZone }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [audience, setAudience] = useState<RequirementAudienceSelection>(
    emptyRequirementAudienceSelection(),
  );

  function onSubmit(formData: FormData) {
    setError(null);
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
    startTransition(async () => {
      const result = await createRequirementDraftAction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.requirementId) {
        router.push(requirementDetailHref(result.requirementId));
      }
    });
  }

  return (
    <SceWorkspaceChrome
      className="mx-auto max-w-4xl"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Aufgaben", href: buildAufgabenBereichHref("anforderungen") },
        { label: "Neue Anforderung" },
      ]}
      header={{
        title: "Neue Anforderung",
        description:
          "Mehrere Personen müssen individuell bestätigen. Empfänger werden beim Aktivieren festgelegt.",
        secondaryActions: (
          <Link
            href={buildAufgabenBereichHref("anforderungen")}
            className="fca-button-secondary inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Anforderungen
          </Link>
        ),
      }}
      density="dense"
    >
      {error ? (
        <SceSemanticFeedback tone="ERROR" title="Speichern fehlgeschlagen" description={error} />
      ) : null}
      <form
        action={onSubmit}
        className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
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
          <SceFormField label="Fällig am" density="DENSE">
            <input type="date" name="dueAt" disabled={pending} className="fca-input w-full text-sm" />
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
        <RequirementAudienceBuilder value={audience} onChange={setAudience} disabled={pending} />
        <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Link href={buildAufgabenBereichHref("anforderungen")} className="fca-button-secondary text-sm">
            Abbrechen
          </Link>
          <button type="submit" className="fca-button-primary text-sm" disabled={pending}>
            Entwurf speichern
          </button>
        </div>
      </form>
    </SceWorkspaceChrome>
  );
}
