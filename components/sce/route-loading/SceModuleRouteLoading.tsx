import { PersonalDashboardCommandCenterLoadingSurface } from "@/components/admin/dashboard/PersonalDashboardCommandCenterLoadingSurface";
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
        <div
          className="motion-safe:animate-pulse motion-reduce:animate-none rounded-xl bg-[var(--surface-2)] p-5"
          data-testid="personal-dashboard-greeting-loading"
        >
          <div className="mb-2 h-7 w-56 rounded-md bg-[var(--surface-3,var(--surface-2))]" />
          <div className="h-3.5 w-72 max-w-full rounded-md bg-[var(--surface-3,var(--surface-2))]" />
        </div>
        <PersonalDashboardCommandCenterLoadingSurface mode="full" />
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
