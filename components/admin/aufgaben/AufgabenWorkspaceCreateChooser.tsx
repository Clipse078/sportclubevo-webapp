"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS } from "@/lib/design-system/sce-form-control-micro-ux";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import type { QuickCreateCurrentUser } from "./MeineAufgabenQuickCreateDialog";
import MeineAufgabenQuickCreateDialog from "./MeineAufgabenQuickCreateDialog";
import AufgabenQuickCreateDialog from "./AufgabenQuickCreateDialog";
import RequirementQuickCreateDialog from "./RequirementQuickCreateDialog";

export type AufgabenCreateChooserVariant = "meine" | "verwaltung";

type Props = {
  variant: AufgabenCreateChooserVariant;
  canCreateTask: boolean;
  canCreateRequirement: boolean;
  timeZone: string;
  assigneeOptions?: TaskAssigneeOption[];
  canManageTasks?: boolean;
  meineQuickCreate?: {
    canCreateSelf: boolean;
    canAssignOthers: boolean;
    canOpenFullCreate?: boolean;
    currentUser: QuickCreateCurrentUser;
  };
};

type CreateChoice = "aufgabe" | "anforderung";

function CreateChoiceButton({
  title,
  subtitle,
  description,
  example,
  cta,
  accentClass,
  onSelect,
  testId,
}: {
  title: string;
  subtitle: string;
  description: string;
  example: string;
  cta: string;
  accentClass: string;
  onSelect: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={testId}
      aria-label={`${title}: ${subtitle}`}
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors",
        "hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]/40",
        SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS,
        accentClass,
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{title}</p>
        <p className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">{subtitle}</p>
      </div>
      <p className="text-sm text-[var(--text-2)]">{description}</p>
      <p className="text-xs text-[var(--muted)]">{example}</p>
      <span className="text-sm font-medium text-[var(--primary)]">{cta}</span>
    </button>
  );
}

export default function AufgabenWorkspaceCreateChooser({
  variant,
  canCreateTask,
  canCreateRequirement,
  timeZone,
  assigneeOptions = [],
  canManageTasks = false,
  meineQuickCreate,
}: Props) {
  const [chooserExpanded, setChooserExpanded] = useState(false);
  const [activeChoice, setActiveChoice] = useState<CreateChoice | null>(null);
  const [taskExpanded, setTaskExpanded] = useState(false);
  const [requirementDialogOpen, setRequirementDialogOpen] = useState(false);

  const showChooser = canCreateTask && canCreateRequirement;
  const singleTaskOnly = canCreateTask && !canCreateRequirement;
  const singleRequirementOnly = !canCreateTask && canCreateRequirement;

  if (!canCreateTask && !canCreateRequirement) return null;

  function openChooser() {
    if (showChooser) {
      setChooserExpanded(true);
      setActiveChoice(null);
      setTaskExpanded(false);
      return;
    }
    if (singleTaskOnly) {
      setTaskExpanded(true);
      return;
    }
    if (singleRequirementOnly) {
      setRequirementDialogOpen(true);
    }
  }

  function selectAufgabe() {
    setActiveChoice("aufgabe");
    setTaskExpanded(true);
    setChooserExpanded(false);
  }

  function selectAnforderung() {
    setActiveChoice("anforderung");
    setRequirementDialogOpen(true);
    setChooserExpanded(false);
  }

  const meineTaskCreate =
    variant === "meine" && meineQuickCreate ? (
      <MeineAufgabenQuickCreateDialog
        {...meineQuickCreate}
        timeZone={timeZone}
        hideTrigger
        inlineFlow
        expanded={taskExpanded}
        onExpandedChange={setTaskExpanded}
      />
    ) : variant === "verwaltung" ? (
      <AufgabenQuickCreateDialog
        canCreate={canCreateTask}
        canManage={canManageTasks}
        assigneeOptions={assigneeOptions}
        hideTrigger
        inlineFlow
        expanded={taskExpanded}
        onExpandedChange={setTaskExpanded}
      />
    ) : null;

  return (
    <div className="space-y-3" data-testid="aufgaben-workspace-create-flow">
      <div className="flex justify-end">
        <button
          type="button"
          className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
          onClick={openChooser}
          data-testid="aufgaben-workspace-create-open"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Erstellen
        </button>
      </div>

      {showChooser && chooserExpanded ? (
        <div
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-4"
          data-testid="aufgaben-create-chooser-inline"
        >
          <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">Was möchtest du erstellen?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <CreateChoiceButton
              title="Aufgabe"
              subtitle="Etwas erledigen"
              description="Arbeit selbst erledigen oder einer bzw. mehreren Personen zuweisen."
              example="z. B. Material bestellen"
              cta="Aufgabe erstellen"
              accentClass="border-l-[3px] border-l-[var(--sce-warning)]"
              onSelect={selectAufgabe}
              testId="aufgaben-create-choice-aufgabe"
            />
            <CreateChoiceButton
              title="Anforderung"
              subtitle="Bestätigung einholen"
              description="Von mehreren Personen eine individuelle Bestätigung einholen."
              example="z. B. Trainerhandbuch bestätigen"
              cta="Anforderung erstellen"
              accentClass="border-l-[3px] border-l-[var(--sce-success)]"
              onSelect={selectAnforderung}
              testId="aufgaben-create-choice-anforderung"
            />
          </div>
          <button
            type="button"
            className="fca-button-secondary mt-3 text-sm"
            onClick={() => setChooserExpanded(false)}
            data-testid="aufgaben-create-chooser-cancel"
          >
            Abbrechen
          </button>
        </div>
      ) : null}

      {(singleTaskOnly || activeChoice === "aufgabe" || (showChooser && taskExpanded)) && canCreateTask
        ? meineTaskCreate
        : null}

      {(singleRequirementOnly || activeChoice === "anforderung") && canCreateRequirement ? (
        <RequirementQuickCreateDialog
          canCreate
          timeZone={timeZone}
          open={requirementDialogOpen}
          onOpenChange={setRequirementDialogOpen}
          hideTrigger
        />
      ) : null}
    </div>
  );
}
