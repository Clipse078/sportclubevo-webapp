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
  children?: ReactNode;
  emptyNoticeKey?: "tasks" | "requirements" | "collaboration" | "generic";
};

export default function PlanningEditorParticipantsSection({
  headingId,
  testId = "planning-participants-section",
  persisted,
  children,
  emptyNoticeKey = "generic",
}: Props) {
  const t = useTranslations("PlanningEditor.operational.participants");

  return (
    <PlanningEditorSection testId={testId} ariaLabelledBy={headingId}>
      <PlanningEditorSectionHeading id={headingId} title={t("heading")} description={t("description")} />
      {!persisted ? (
        <PlanningEditorPrePersistNotice messageKey={emptyNoticeKey} testId={`${testId}-pre-persist`} />
      ) : (
        children
      )}
    </PlanningEditorSection>
  );
}
