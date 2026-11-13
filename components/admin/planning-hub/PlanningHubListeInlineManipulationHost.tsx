"use client";

import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { PlanningHubListeMenuAction } from "@/lib/planning-hub/liste-operational-menu";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import PlanningHubActivityScheduleEditDialog from "./PlanningHubActivityScheduleEditDialog";
import PlanningHubManipulationEditDialog from "./PlanningHubManipulationEditDialog";
import { usePlanningHubManipulation } from "./PlanningHubManipulationContext";

type Props = {
  item: WeekplannerItem;
  focus?: PlanningHubListeMenuAction | null;
  locale?: string;
  timezone?: string;
  resourceCategory?: "pitch" | "dressing";
  pitchGroups?: FacilityGroup[];
  dressingGroups?: FacilityGroup[];
  onSaved?: () => void;
};

/**
 * Embeds canonical manipulation / schedule editors inside the Liste operational expansion (no modal).
 */
export default function PlanningHubListeInlineManipulationHost({
  item,
  focus = null,
  locale = "de-CH",
  timezone = "Europe/Zurich",
  onSaved,
}: Props) {
  const manipulation = usePlanningHubManipulation();

  if (!manipulation) return null;

  const showResource =
    (focus === "pitch" || focus === "dressing") && manipulation.inlineResourceEdit?.item.id === item.id;

  const showSchedule = focus === "schedule" && manipulation.inlineScheduleEdit?.id === item.id;

  if (!showResource && !showSchedule) return null;

  if (showResource && manipulation.inlineResourceEdit) {
    const target = manipulation.inlineResourceEdit;
    return (
      <div className="mb-2">
        <PlanningHubManipulationEditDialog
          presentation="inline"
          item={target.item}
          segmentId={target.segmentId}
          resourceId={target.resourceId}
          locale={locale}
          timezone={timezone}
          resourceCategory={target.resourceCategory}
          resourceOptions={target.resourceOptions}
          planningResourceGroups={target.planningResourceGroups}
          facilityGroups={target.facilityGroups}
          allItems={target.allItems}
          onClose={() => {
            manipulation.closeInlineResourceEdit();
          }}
          onSubmitDraft={manipulation.submitEditorDraft}
          onApplyDraft={manipulation.applyEditorDraft}
          applySaving={manipulation.editorApplySaving}
          applyError={manipulation.editorApplyError}
          evaluateConflicts={target.evaluateConflicts}
        />
      </div>
    );
  }

  if (showSchedule && manipulation.inlineScheduleEdit) {
    const scheduleItem = manipulation.inlineScheduleEdit;
    return (
      <div className="mb-2">
        <PlanningHubActivityScheduleEditDialog
          presentation="inline"
          item={scheduleItem}
          locale={locale}
          timezone={timezone}
          resourceCategory={manipulation.inlineScheduleResourceCategory}
          planningResourceGroups={manipulation.inlineSchedulePlanningResourceGroups}
          onClose={() => {
            manipulation.closeInlineScheduleEdit();
          }}
          onSubmitDraft={manipulation.submitEditorDraft}
          onApplyDraft={manipulation.applyEditorDraft}
          applySaving={manipulation.editorApplySaving}
          applyError={manipulation.editorApplyError}
          evaluateConflicts={(draft) => manipulation.evaluateScheduleConflicts(draft)}
          resolveResourceRef={manipulation.resolveResourceRef}
        />
      </div>
    );
  }

  return null;
}
