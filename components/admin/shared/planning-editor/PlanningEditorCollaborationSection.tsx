"use client";

import { useTranslations } from "next-intl";
import type { CommunicationTargetType } from "@prisma/client";
import { InternalCommentsPanel } from "@/components/admin/communications/InternalCommentsPanel";
import PlanningEditorSection from "./PlanningEditorSection";
import PlanningEditorSectionHeading from "./PlanningEditorSectionHeading";
import PlanningEditorPrePersistNotice from "./PlanningEditorPrePersistNotice";

type Props = {
  headingId: string;
  testId?: string;
  persisted: boolean;
  tenantSlug: string;
  targetType?: CommunicationTargetType;
  targetId?: string;
  canEdit: boolean;
  currentUserId: string | null;
  locale: string;
  timezone: string;
};

export default function PlanningEditorCollaborationSection({
  headingId,
  testId = "planning-collaboration-section",
  persisted,
  tenantSlug,
  targetType,
  targetId,
  canEdit,
  currentUserId,
  locale,
  timezone,
}: Props) {
  const t = useTranslations("PlanningEditor.operational.collaboration");

  return (
    <PlanningEditorSection testId={testId} ariaLabelledBy={headingId}>
      <PlanningEditorSectionHeading id={headingId} title={t("heading")} description={t("description")} />
      {!persisted ? (
        <PlanningEditorPrePersistNotice messageKey="collaboration" testId={`${testId}-pre-persist`} />
      ) : targetType && targetId ? (
        <InternalCommentsPanel
          tenantSlug={tenantSlug}
          targetType={targetType}
          targetId={targetId}
          canEdit={canEdit}
          currentUserId={currentUserId}
          locale={locale}
          timezone={timezone}
          enabled
        />
      ) : (
        <p className="text-sm text-[var(--text-2)]">{t("unavailable")}</p>
      )}
    </PlanningEditorSection>
  );
}
