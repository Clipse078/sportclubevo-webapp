"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";
import { SCE_DIALOG_WORKSPACE_PANEL } from "@/lib/shell/responsive-layout";
import { buildAufgabenBereichHref } from "@/lib/personal-actions/aufgaben-scope";
import { requirementDetailHref } from "@/lib/requirements/management-navigation";
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
  const [audience, setAudience] = useState<RequirementAudienceSelection>({
    personIds: [],
    teamIds: [],
    orgUnitIds: [],
    roleIds: [],
    targetGroupIds: [],
  });

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("audiencePersonIds", audience.personIds.join(","));
    formData.set("audienceTeamIds", audience.teamIds.join(","));
    formData.set("audienceOrgUnitIds", audience.orgUnitIds.join(","));
    formData.set("audienceRoleIds", audience.roleIds.join(","));
    formData.set("audienceTargetGroupIds", audience.targetGroupIds.join(","));
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
    <div className={`mx-auto w-full max-w-4xl space-y-4 px-1 py-2 ${SCE_DIALOG_WORKSPACE_PANEL}`}>
      <Link
        href={buildAufgabenBereichHref("anforderungen")}
        className="inline-flex items-center gap-1 text-sm text-[var(--text-2)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Anforderungen
      </Link>
      <header>
        <h1 className="text-xl font-semibold">Neue Anforderung</h1>
        <p className="mt-1 text-sm text-[var(--text-2)]">
          Mehrere Personen müssen individuell bestätigen. Empfänger werden beim Aktivieren
          festgelegt.
        </p>
      </header>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <form action={onSubmit} className="space-y-5 rounded-xl border border-[var(--border)] p-4 sm:p-5">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[var(--text-2)]">Titel</span>
          <input
            name="title"
            required
            disabled={pending}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
            placeholder="Trainershandbuch 2026/27 bestätigen"
            data-testid="requirement-create-title"
          />
        </label>
        <TaskDescriptionFormField name="description" disabled={pending} compact />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-2)]">Fällig am</span>
            <input
              type="date"
              name="dueAt"
              disabled={pending}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
            />
          </label>
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
    </div>
  );
}
