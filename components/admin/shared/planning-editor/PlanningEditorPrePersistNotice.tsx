"use client";

import { useTranslations } from "next-intl";

type Props = {
  testId?: string;
  messageKey?: "tasks" | "requirements" | "collaboration" | "generic";
};

export default function PlanningEditorPrePersistNotice({
  testId = "planning-pre-persist-notice",
  messageKey = "generic",
}: Props) {
  const t = useTranslations("PlanningEditor.operational.prePersist");

  return (
    <p className="text-sm text-[var(--text-2)]" data-testid={testId}>
      {t(messageKey)}
    </p>
  );
}
