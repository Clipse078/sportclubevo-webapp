import { SceModuleRouteLoading } from "@/components/sce/route-loading/SceModuleRouteLoading";
import { SCE_DASHBOARD_SEGMENT_LOADING_MODULE } from "@/lib/sce/route-module-loading";

/** Fallback for `/dashboard/*` child routes without their own loading.tsx (SCE-PERF-02). */
export default function DashboardSegmentLoading() {
  return <SceModuleRouteLoading module={SCE_DASHBOARD_SEGMENT_LOADING_MODULE} />;
}
