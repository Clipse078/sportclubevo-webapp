"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import { useOptionalContextDirtyNavigation } from "@/lib/context-tabs";
import SceInlineDiscardConfirm from "@/components/sce/club-development/SceInlineDiscardConfirm";
import {
  type CdConnectedView,
  buildConnectedWorkspaceHref,
  carryWorkspaceSearchParams,
  filterVisibleConnectedViews,
  CD_CONNECTED_VIEW_LABELS,
} from "@/lib/club-development/vereinsentwicklung-connected-workspace";
import { parseConnectedViewFromLocation } from "@/lib/club-development/vereinsentwicklung-connected-workspace";
import VereinsentwicklungOrgEinheitFilterChip from "./VereinsentwicklungOrgEinheitFilterChip";

type Props = {
  permissionKeys: string[];
  hasPlanningAccess: boolean;
  activeView?: CdConnectedView;
  orgEinheitFilterLabel?: string | null;
};

export default function VereinsentwicklungConnectedWorkspaceNav({
  permissionKeys,
  hasPlanningAccess,
  activeView: activeViewProp,
  orgEinheitFilterLabel = null,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dirtyNav = useOptionalContextDirtyNavigation();
  const [pendingView, setPendingView] = useState<CdConnectedView | null>(null);

  const visibleViews = useMemo(
    () => filterVisibleConnectedViews(permissionKeys, hasPlanningAccess),
    [permissionKeys, hasPlanningAccess],
  );

  const activeView = useMemo(() => {
    if (activeViewProp) return activeViewProp;
  const fromLocation = parseConnectedViewFromLocation(pathname, searchParams);
    return fromLocation && visibleViews.includes(fromLocation) ? fromLocation : visibleViews[0] ?? "uebersicht";
  }, [activeViewProp, pathname, searchParams, visibleViews]);

  const carryParams = useMemo(
    () => carryWorkspaceSearchParams(searchParams),
    [searchParams],
  );

  const navigateTo = useCallback(
    (view: CdConnectedView) => {
      if (view === activeView) return;
      const href = buildConnectedWorkspaceHref(view, carryParams);
      if (!dirtyNav?.isDirty) {
        router.push(href);
        return;
      }
      setPendingView(view);
    },
    [activeView, carryParams, dirtyNav?.isDirty, router],
  );

  const confirmDiscard = () => {
    if (!pendingView) return;
    dirtyNav?.setDirty(false);
    router.push(buildConnectedWorkspaceHref(pendingView, carryParams));
    setPendingView(null);
  };

  if (visibleViews.length <= 1) return null;

  return (
    <div className="mb-6 space-y-3" data-testid="vereinsentwicklung-connected-workspace-nav">
      {orgEinheitFilterLabel ? (
        <VereinsentwicklungOrgEinheitFilterChip label={orgEinheitFilterLabel} />
      ) : null}
      {pendingView ? (
        <SceInlineDiscardConfirm
          onContinueEditing={() => setPendingView(null)}
          onDiscard={confirmDiscard}
          testId="vereinsentwicklung-connected-workspace-nav-discard"
        />
      ) : null}
      <SceSegmentedControl
        value={activeView}
        options={visibleViews.map((view) => ({
          value: view,
          label: CD_CONNECTED_VIEW_LABELS[view],
        }))}
        onChange={navigateTo}
        aria-label="Vereinsentwicklung Arbeitsansichten"
        testId="vereinsentwicklung-connected-workspace-nav-control"
      />
    </div>
  );
}