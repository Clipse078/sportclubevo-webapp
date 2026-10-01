import { SceModuleRouteLoading } from "@/components/sce/route-loading/SceModuleRouteLoading";

/** Personal dashboard index only — cockpit skeleton must not leak to other modules. */
export default function PersonalDashboardLoading() {
  return <SceModuleRouteLoading module="dashboard" />;
}
