"use client";

import Link from "next/link";
import { useState } from "react";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
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

type ContextBlocked = {
  contextType: TaskContextType;
  contextId: string;
  returnTo: string;
};

type Props = {
  backHref: string;
  initialTitle: string;
  originMeetingSlug: string | null;
  contextual: ContextualProps | null;
  contextBlocked: ContextBlocked | null;
  /** Full create when no fixed context was requested (generic Neue Aufgabe). */
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
  contextBlocked,
  fullCreate,
}: Props) {
  const [contextualExpanded, setContextualExpanded] = useState(true);

  const headerDescription = contextual
    ? "Die Aufgabe wird dem gewählten Kontext zugeordnet."
    : "Alle Details für eine operative Aufgabe.";

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
          description: contextBlocked ? undefined : headerDescription,
          secondaryActions: (
            <Link
              href={contextBlocked?.returnTo ?? backHref}
              className="fca-button-secondary text-sm"
            >
              Zurück
            </Link>
          ),
        }}
        density="dense"
      >
        <div className="mx-auto w-full max-w-3xl" data-testid="task-workspace-create">
            {contextBlocked ? (
              <section
                className="rounded-xl border border-amber-500/40 bg-amber-950/20 px-4 py-4"
                data-testid="aufgaben-neu-context-blocked"
              >
                <h2 className="text-sm font-semibold text-amber-100">
                  Kontext nicht verfügbar
                </h2>
                <p className="mt-2 text-sm text-amber-50/90">
                  Das gewählte Ziel ist nicht sichtbar oder Sie haben keine Berechtigung, hier eine
                  kontextbezogene Aufgabe anzulegen. Es wird keine Aufgabe ohne diesen Kontext
                  erstellt.
                </p>
                <Link
                  href={contextBlocked.returnTo}
                  className="mt-4 inline-flex text-sm font-medium text-[var(--sce-primary)] underline"
                >
                  Zurück zum Ausgangspunkt
                </Link>
              </section>
            ) : contextual ? (
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
      </SceWorkspaceChrome>
    </div>
  );
}
