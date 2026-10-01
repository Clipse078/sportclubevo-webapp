import { DashboardCockpitGrid } from "@/components/ui/dashboard/DashboardCockpitGrid";
import { DashboardCockpitCard } from "@/components/ui/dashboard/DashboardCockpitCard";

export function ClubDashboardCommandCenterSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 lg:gap-3" aria-busy="true" aria-label="Dashboard wird geladen">
      <DashboardCockpitGrid>
        {Array.from({ length: 4 }).map((_, index) => (
          <DashboardCockpitCard key={index} title="…" icon={null}>
            <div className="space-y-2 py-2">
              <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--surface-2)]" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-[var(--surface-2)]" />
              <div className="h-3 w-2/5 animate-pulse rounded bg-[var(--surface-2)]" />
            </div>
          </DashboardCockpitCard>
        ))}
      </DashboardCockpitGrid>
      <div className="h-16 animate-pulse rounded-xl bg-[var(--surface-2)]" />
    </div>
  );
}
