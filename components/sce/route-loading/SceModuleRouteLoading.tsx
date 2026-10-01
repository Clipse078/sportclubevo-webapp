import { ClubDashboardCommandCenterSkeleton } from "@/components/admin/dashboard/ClubDashboardCommandCenterSkeleton";
import {
  SCE_ROUTE_MODULE_LOADING,
  type SceRouteModuleLoadingId,
} from "@/lib/sce/route-module-loading";
import { SceRouteLoadingShell } from "./SceRouteLoadingShell";

export type SceModuleRouteLoadingProps = {
  module: SceRouteModuleLoadingId;
};

/**
 * Route-level loading UI for authenticated modules (SCE-PERF-02).
 */
export function SceModuleRouteLoading({ module }: SceModuleRouteLoadingProps) {
  if (module === "dashboard") {
    return (
      <div
        className="mx-auto flex w-full min-w-0 max-w-[1400px] flex-col gap-2.5 lg:gap-3"
        data-testid={SCE_ROUTE_MODULE_LOADING.dashboard.testId}
        aria-busy="true"
      >
        <div className="h-28 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
        <ClubDashboardCommandCenterSkeleton />
      </div>
    );
  }

  const spec = SCE_ROUTE_MODULE_LOADING[module];
  return (
    <SceRouteLoadingShell
      title={spec.title}
      subtitle={spec.subtitle}
      testId={spec.testId}
    />
  );
}
