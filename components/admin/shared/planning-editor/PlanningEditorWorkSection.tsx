"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import PlanningEditorSection from "./PlanningEditorSection";
import PlanningEditorSectionHeading from "./PlanningEditorSectionHeading";
import PlanningEditorPrePersistNotice from "./PlanningEditorPrePersistNotice";

type Props = {
  headingId: string;
  testId?: string;
  persisted: boolean;
  locale: string;
  tasksPanel: ReactNode | null;
  requirementsPanel?: ReactNode | null;
};

export default function PlanningEditorWorkSection({
  headingId,
  testId = "planning-work-section",
  persisted,
  locale,
  tasksPanel,
  requirementsPanel = null,
}: Props) {
  const t = useTranslations("PlanningEditor.operational.work");

  return (
    <PlanningEditorSection testId={testId} ariaLabelledBy={headingId}>
      <PlanningEditorSectionHeading id={headingId} title={t("heading")} description={t("description")} />
      <div className="space-y-4">
        {!persisted ? (
          <>
            <PlanningEditorPrePersistNotice messageKey="tasks" testId={`${testId}-tasks-pre-persist`} />
            <PlanningEditorPrePersistNotice
              messageKey="requirements"
              testId={`${testId}-requirements-pre-persist`}
            />
          </>
        ) : (
          <>
            {tasksPanel}
            {requirementsPanel}
          </>
        )}
      </div>
    </PlanningEditorSection>
  );
}
