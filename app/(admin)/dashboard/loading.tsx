import { ClubDashboardCommandCenterSkeleton } from "@/components/admin/dashboard/ClubDashboardCommandCenterSkeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1400px] flex-col gap-2.5 lg:gap-3">
      <div className="h-28 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
      <ClubDashboardCommandCenterSkeleton />
    </div>
  );
}
