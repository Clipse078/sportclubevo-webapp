"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { SCE_DIALOG_WORKSPACE_PANEL } from "@/lib/shell/responsive-layout";
import type { TaskContextType } from "@prisma/client";
import type { TaskContextPresentation } from "@/lib/tasks/context-resolution";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import ContextualTaskInlineCreateCard from "./contextual/ContextualTaskInlineCreateCard";
import AufgabenFullCreateCollapsibleCard from "./AufgabenFullCreateCollapsibleCard";

type ContextualProps = {
  contextType: TaskContextType;
  contextId: string;
  presentation: TaskContextPresentation | null;
  orgUnitOptions: TaskOrgUnitPickerOption[];
  timeZone: string;
  tenantWideVisibility: boolean;
};

type Props = {
  backHref: string;
  initialTitle: string;
  originMeetingSlug: string | null;
  contextual: ContextualProps | null;
  /** Full create (no fixed context or eligibility miss with partial context labels). */
  fullCreate: {
    orgUnitOptions: TaskOrgUnitPickerOption[];
    timeZone: string;
    initialContextType: TaskContextType | null;
    initialContextId: string | null;
    initialContextLabel: string | null;
  };
};

export default function AufgabenNeuClient({
  backHref,
  initialTitle,
  originMeetingSlug,
  contextual,
  fullCreate,
}: Props) {
  const [contextualExpanded, setContextualExpanded] = useState(true);

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6">
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Aufgaben", href: backHref },
          { label: "Neu" },
        ]}
        header={{
          title: "Neue Aufgabe",
          description: contextual
            ? "Kontextbezogene Aufgabe — inline erstellen."
            : "Alle Details für eine operative Aufgabe.",
          secondaryActions: (
            <Link href={backHref} className="fca-button-secondary text-sm">
              Zurück
            </Link>
          ),
        }}
        density="dense"
      >
        <div
          className={cn(SCE_DIALOG_WORKSPACE_PANEL, "min-h-[40vh] w-full")}
          data-testid="task-workspace-create"
        >
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {contextual ? (
              <ContextualTaskInlineCreateCard
                expanded={contextualExpanded}
                onExpandedChange={setContextualExpanded}
                contextType={contextual.contextType}
                contextId={contextual.contextId}
                presentation={contextual.presentation}
                orgUnitOptions={contextual.orgUnitOptions}
                timeZone={contextual.timeZone}
                tenantWideVisibility={contextual.tenantWideVisibility}
                successMode="navigate"
                initialTitle={initialTitle}
                panelDomId="aufgaben-neu-contextual-panel"
                formDomId="aufgaben-neu-contextual-form"
                cardTestId="aufgaben-neu-contextual-inline-card"
                collapseToggleTestId="aufgaben-neu-contextual-collapse"
              />
            ) : (
              <AufgabenFullCreateCollapsibleCard
                orgUnitOptions={fullCreate.orgUnitOptions}
                timeZone={fullCreate.timeZone}
                initialContextType={fullCreate.initialContextType}
                initialContextId={fullCreate.initialContextId}
                initialContextLabel={fullCreate.initialContextLabel}
                initialTitle={initialTitle}
                originMeetingSlug={originMeetingSlug}
                defaultExpanded
              />
            )}
          </div>
        </div>
      </SceWorkspaceChrome>
    </div>
  );
}
