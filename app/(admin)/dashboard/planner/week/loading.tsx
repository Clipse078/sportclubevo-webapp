import PlanningHubLoadingShell from "@/components/admin/planning-hub/loading/PlanningHubLoadingShell";

/**
 * PLANNING-HUB-03D — premium Wochenplaner loading (route-level fallback).
 */
export default function PlannerWeekLoading() {
  return <PlanningHubLoadingShell includeChromeSkeleton perspective="kalender" />;
}
