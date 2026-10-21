"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
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
  const [chooserOpen, setChooserOpen] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<CreateChoice | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [requirementDialogOpen, setRequirementDialogOpen] = useState(false);
  const restoreFocusRef = useRef<HTMLButtonElement>(null);

  const showChooser = canCreateTask && canCreateRequirement;
  const singleTaskOnly = canCreateTask && !canCreateRequirement;
  const singleRequirementOnly = !canCreateTask && canCreateRequirement;

  const openTaskAfterChooser = useCallback(() => {
    setPendingChoice("aufgabe");
    setChooserOpen(false);
  }, []);

  const openRequirementAfterChooser = useCallback(() => {
    setPendingChoice("anforderung");
    setChooserOpen(false);
  }, []);

  useEffect(() => {
    if (!chooserOpen && pendingChoice) {
      const id = window.requestAnimationFrame(() => {
        if (pendingChoice === "aufgabe") setTaskDialogOpen(true);
        if (pendingChoice === "anforderung") setRequirementDialogOpen(true);
        setPendingChoice(null);
      });
      return () => window.cancelAnimationFrame(id);
    }
    return undefined;
  }, [chooserOpen, pendingChoice]);

  if (!canCreateTask && !canCreateRequirement) return null;

  function closeChooser() {
    setChooserOpen(false);
    restoreFocusRef.current?.focus();
  }

  return (
    <>
      {showChooser ? (
        <>
          <button
            ref={restoreFocusRef}
            type="button"
            className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
            onClick={() => setChooserOpen(true)}
            data-testid="aufgaben-workspace-create-open"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Erstellen
          </button>

          <div data-testid="aufgaben-create-chooser-dialog">
          <Dialog
            open={chooserOpen}
            onClose={closeChooser}
            title="Was möchtest du erstellen?"
            size="md"
            bodyLayout="scroll"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <CreateChoiceButton
                title="Aufgabe"
                subtitle="Etwas erledigen"
                description="Arbeit selbst erledigen oder einer bzw. mehreren Personen zuweisen."
                example="z. B. Material bestellen"
                cta="Aufgabe erstellen"
                accentClass="border-l-[3px] border-l-[var(--sce-warning)]"
                onSelect={openTaskAfterChooser}
                testId="aufgaben-create-choice-aufgabe"
              />
              <CreateChoiceButton
                title="Anforderung"
                subtitle="Bestätigung einholen"
                description="Von mehreren Personen eine individuelle Bestätigung einholen."
                example="z. B. Trainerhandbuch bestätigen"
                cta="Anforderung erstellen"
                accentClass="border-l-[3px] border-l-[var(--sce-success)]"
                onSelect={openRequirementAfterChooser}
                testId="aufgaben-create-choice-anforderung"
              />
            </div>
          </Dialog>
          </div>
        </>
      ) : singleTaskOnly ? (
        variant === "meine" && meineQuickCreate ? (
          <MeineAufgabenQuickCreateDialog
            {...meineQuickCreate}
            timeZone={timeZone}
            triggerLabel="Erstellen"
            triggerTestId="aufgaben-workspace-create-open"
          />
        ) : (
          <AufgabenQuickCreateDialog
            canCreate
            canManage={canManageTasks}
            assigneeOptions={assigneeOptions}
            triggerLabel="Erstellen"
            triggerTestId="aufgaben-workspace-create-open"
          />
        )
      ) : singleRequirementOnly ? (
        <RequirementQuickCreateDialog
          canCreate
          timeZone={timeZone}
          triggerLabel="Erstellen"
          triggerTestId="aufgaben-workspace-create-open"
        />
      ) : null}

      {showChooser && canCreateTask ? (
        variant === "meine" && meineQuickCreate ? (
          <MeineAufgabenQuickCreateDialog
            {...meineQuickCreate}
            timeZone={timeZone}
            open={taskDialogOpen}
            onOpenChange={setTaskDialogOpen}
            hideTrigger
          />
        ) : (
          <AufgabenQuickCreateDialog
            canCreate
            canManage={canManageTasks}
            assigneeOptions={assigneeOptions}
            open={taskDialogOpen}
            onOpenChange={setTaskDialogOpen}
            hideTrigger
          />
        )
      ) : null}

      {showChooser && canCreateRequirement ? (
        <RequirementQuickCreateDialog
          canCreate
          timeZone={timeZone}
          open={requirementDialogOpen}
          onOpenChange={setRequirementDialogOpen}
          hideTrigger
        />
      ) : null}
    </>
  );
}
