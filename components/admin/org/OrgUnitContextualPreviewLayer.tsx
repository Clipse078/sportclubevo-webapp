"use client";

import { useLayoutEffect, useMemo, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import SceOrgUnitPreviewCard from "@/components/sce/org/SceOrgUnitPreviewCard";
import {
  buildSceOrgUnitPreviewModel,
  type OrgUnitPreviewRoleResolver,
} from "@/lib/org/org-unit-preview-model";
import type { OrgUnitBuilderEnrichmentMap } from "@/lib/org/org-unit-builder-enrichment";
import {
  computeOrgUnitPreviewPlacement,
  SCE_ORG_UNIT_PREVIEW_WIDTH_PX,
  type OrgUnitPreviewChromeInsets,
} from "@/lib/org/org-unit-preview-placement";
import type { OrgUnitCanvasItem } from "@/components/admin/org/OrgUnitCanvasView";

type Props = {
  openUnitId: string | null;
  orgUnits: OrgUnitCanvasItem[];
  enrichment: OrgUnitBuilderEnrichmentMap;
  resolveRoleName?: OrgUnitPreviewRoleResolver;
  viewportRef: RefObject<HTMLElement | null>;
  chromeInsets?: OrgUnitPreviewChromeInsets;
  onPreviewPointerEnter: () => void;
  onPreviewPointerLeave: () => void;
  onPreviewFocus: () => void;
  onPreviewBlur: (relatedTarget: EventTarget | null) => void;
  onOpenDetails: (unitId: string) => void;
  onViewAllStaff?: (unitId: string) => void;
};

export default function OrgUnitContextualPreviewLayer({
  openUnitId,
  orgUnits,
  enrichment,
  resolveRoleName,
  viewportRef,
  chromeInsets,
  onPreviewPointerEnter,
  onPreviewPointerLeave,
  onPreviewFocus,
  onPreviewBlur,
  onOpenDetails,
  onViewAllStaff,
}: Props) {
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null);

  const unit = useMemo(
    () => (openUnitId ? orgUnits.find((u) => u.id === openUnitId) : undefined),
    [openUnitId, orgUnits],
  );

  const model = useMemo(() => {
    if (!unit) return null;
    const extra = enrichment[unit.id];
    return buildSceOrgUnitPreviewModel({
      unit: {
        id: unit.id,
        name: unit.name,
        type: unit.type,
        status: unit.status,
        description: unit.description,
        childCount: unit._count.children,
        teamCount: extra?.teamCount ?? 0,
        staffCount: extra?.staffCount ?? 0,
      },
      memberships: extra?.primaryMemberships ?? [],
      staffAssignments: extra?.staffAssignments ?? [],
      resolveRoleName,
    });
  }, [unit, enrichment, resolveRoleName]);

  useLayoutEffect(() => {
    if (!openUnitId || typeof window === "undefined") {
      setPlacement(null);
      return;
    }

    let cancelled = false;
    let retryFrame = 0;

    const resolveAnchor = (): HTMLElement | null => {
      const scoped = viewportRef.current?.querySelector<HTMLElement>(
        `[data-org-unit-node="${openUnitId}"]`,
      );
      if (scoped) return scoped;
      return document.querySelector<HTMLElement>(`[data-org-unit-node="${openUnitId}"]`);
    };

    const updatePlacement = () => {
      if (cancelled) return;
      const nodeEl = resolveAnchor();
      if (!nodeEl) {
        if (retryFrame < 4) {
          retryFrame += 1;
          requestAnimationFrame(updatePlacement);
          return;
        }
        setPlacement(null);
        return;
      }
      const anchor = nodeEl.getBoundingClientRect();
      const next = computeOrgUnitPreviewPlacement({
        anchor,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        previewWidth: SCE_ORG_UNIT_PREVIEW_WIDTH_PX,
        chromeInsets,
      });
      setPlacement({ top: next.top, left: next.left });
    };

    updatePlacement();
    return () => {
      cancelled = true;
    };
  }, [openUnitId, viewportRef, chromeInsets, orgUnits]);

  if (!openUnitId || !unit || !model || !placement || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed z-[80] motion-reduce:transition-none"
      style={{
        top: placement.top,
        left: placement.left,
        transform: "none",
      }}
      data-org-contextual-preview
      data-org-contextual-preview-root
      data-org-preview-zoom-independent="true"
      onPointerEnter={onPreviewPointerEnter}
      onPointerLeave={onPreviewPointerLeave}
      onFocus={onPreviewFocus}
      onBlur={(e) => onPreviewBlur(e.relatedTarget)}
    >
      <SceOrgUnitPreviewCard
        model={model}
        unitType={unit.type}
        onOpenDetails={() => onOpenDetails(unit.id)}
        onViewAllStaff={onViewAllStaff ? () => onViewAllStaff(unit.id) : undefined}
      />
    </div>,
    document.body,
  );
}
