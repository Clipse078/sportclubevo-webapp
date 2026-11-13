"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { getPlanningHubItemHref } from "@/lib/planning-hub/planning-navigation";
import type { PlannerCanonicalEditAccess } from "@/lib/planning-hub/planner-canonical-edit-access";
import type { PlanningHubListeMenuAction } from "@/lib/planning-hub/liste-operational-menu";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import type { TenantDressingRoomOccupancyPresets } from "@/lib/dressing-room-occupancy/types";
import type { WeekplannerPlanningDomainEditAccess } from "@/components/admin/planner/WeekplannerPlanningSheet";
import { usePlanningHubManipulation } from "./PlanningHubManipulationContext";
import PlanningHubManipulationEditDialog from "./PlanningHubManipulationEditDialog";
import PlanningHubActivityScheduleEditDialog from "./PlanningHubActivityScheduleEditDialog";

const WeekplannerPlanningSheet = dynamic(
  () => import("@/components/admin/planner/WeekplannerPlanningSheet").then((m) => m.WeekplannerPlanningSheet),
  { ssr: false },
);

export type PlanningHubListeInlineSession = {
  itemId: string;
  mode: PlanningHubListeMenuAction;
} | null;

type Props = {
  item: WeekplannerItem;
  session: PlanningHubListeInlineSession;
  locale: string;
  timezone: string;
  facilityGroupsByAllocationGroup: { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] };
  tenantDressingRoomOccupancyPresets?: TenantDressingRoomOccupancyPresets;
  domainEditAccess: WeekplannerPlanningDomainEditAccess;
  alternativePlanActive: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function PlanningHubListeInlineEditorHost({
  item,
  session,
  locale,
  timezone,
  facilityGroupsByAllocationGroup,
  tenantDressingRoomOccupancyPresets,
  domainEditAccess,
  alternativePlanActive,
  onClose,
  onSaved,
}: Props) {
  const manipulation = usePlanningHubManipulation();

  if (!session || session.itemId !== item.id) return null;

  if (session.mode === "details") {
    const href = getPlanningHubItemHref(item);
    return (
      <div
        className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-sm"
        data-testid={`planning-hub-liste-inline-details-${item.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="font-semibold text-[var(--foreground)]">Details</p>
        <p className="mt-1 text-[var(--text-2)]">
          Vollständige Bearbeitung und erweiterte Felder im Quellmodul.
        </p>
        {href ? (
          <Link
            href={href}
            className="mt-2 inline-flex text-sm font-semibold text-[var(--sce-primary)] hover:underline"
            data-testid={`planning-hub-liste-inline-details-link-${item.id}`}
          >
            Details öffnen →
          </Link>
        ) : (
          <p className="mt-2 text-xs text-[var(--muted)]">Für diesen Typ ist kein Detail-Link verfügbar.</p>
        )}
        <button
          type="button"
          className="mt-3 text-xs font-semibold text-[var(--text-2)] hover:text-[var(--foreground)]"
          onClick={onClose}
        >
          Schließen
        </button>
      </div>
    );
  }

  if (session.mode === "edit") {
    if (alternativePlanActive) {
      return (
        <div
          className="mt-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-3 text-sm text-amber-900"
          data-testid={`planning-hub-liste-inline-operational-gap-${item.id}`}
        >
          <p className="font-semibold">Betriebsplan bearbeiten</p>
          <p className="mt-1 text-xs leading-relaxed">
            Plan-Overrides im Wochenplaner-Modus öffnen sich vorerst im Betriebsplan-Editor
            (kein zweites Datenmodell). Inline-Overrides für alternative Pläne folgen in einem
            separaten Schritt.
          </p>
          <button type="button" className="mt-2 text-xs font-semibold underline" onClick={onClose}>
            Schließen
          </button>
        </div>
      );
    }
    return (
      <WeekplannerPlanningSheet
        item={item}
        facilityGroupsByAllocationGroup={facilityGroupsByAllocationGroup}
        timezone={timezone}
        tenantDressingRoomOccupancyPresets={tenantDressingRoomOccupancyPresets}
        domainEditAccess={domainEditAccess}
        presentation="inline"
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  if (
    (session.mode === "pitch" || session.mode === "dressing") &&
    manipulation?.inlineResourceEdit?.item.id === item.id
  ) {
    const target = manipulation.inlineResourceEdit;
    return (
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
          onClose();
        }}
        onSubmitDraft={manipulation.submitEditorDraft}
        onApplyDraft={manipulation.applyEditorDraft}
        applySaving={manipulation.editorApplySaving}
        applyError={manipulation.editorApplyError}
        evaluateConflicts={target.evaluateConflicts}
      />
    );
  }

  if (session.mode === "schedule" && manipulation?.inlineScheduleEdit?.id === item.id) {
    const scheduleItem = manipulation.inlineScheduleEdit;
    return (
      <PlanningHubActivityScheduleEditDialog
        presentation="inline"
        item={scheduleItem}
        locale={locale}
        timezone={timezone}
        resourceCategory={manipulation.inlineScheduleResourceCategory}
        planningResourceGroups={manipulation.inlineSchedulePlanningResourceGroups}
        onClose={() => {
          manipulation.closeInlineScheduleEdit();
          onClose();
        }}
        onSubmitDraft={manipulation.submitEditorDraft}
        onApplyDraft={manipulation.applyEditorDraft}
        applySaving={manipulation.editorApplySaving}
        applyError={manipulation.editorApplyError}
        evaluateConflicts={(draft) =>
          manipulation.evaluateScheduleConflicts(draft)
        }
        resolveResourceRef={manipulation.resolveResourceRef}
      />
    );
  }

  if (session.mode === "pitch" || session.mode === "dressing") {
    return (
      <WeekplannerPlanningSheet
        item={item}
        facilityGroupsByAllocationGroup={facilityGroupsByAllocationGroup}
        timezone={timezone}
        tenantDressingRoomOccupancyPresets={tenantDressingRoomOccupancyPresets}
        domainEditAccess={domainEditAccess}
        presentation="inline"
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  return null;
}

export function toDomainEditAccess(access: PlannerCanonicalEditAccess | null): WeekplannerPlanningDomainEditAccess {
  return {
    canManageTrainings: access?.canManageTrainings ?? false,
    canManageEvents: access?.canManageEvents ?? false,
  };
}
