import PlanningHubLoadingProgressRail from "@/components/admin/planning-hub/loading/PlanningHubLoadingProgressRail";
import PlanningHubLoadingRing from "@/components/admin/planning-hub/loading/PlanningHubLoadingRing";
import styles from "@/components/admin/planning-hub/loading/planning-hub-loading.module.css";
import { cn } from "@/lib/cn";

export type SceRouteLoadingShellProps = {
  title: string;
  subtitle?: string;
  testId: string;
  className?: string;
};

/**
 * Lightweight, destination-agnostic module loading shell (SCE-PERF-02).
 * Reuses Planning Hub loading chrome without perspective-specific skeletons.
 */
export function SceRouteLoadingShell({
  title,
  subtitle,
  testId,
  className,
}: SceRouteLoadingShellProps) {
  return (
    <div
      className={cn(styles.loadingWorkspace, className)}
      data-testid={testId}
      aria-busy="true"
    >
      <div
        className={styles.loadingComposition}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={title}
      >
        <PlanningHubLoadingRing />
        <div className="mt-5 max-w-md text-center">
          <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
          {subtitle ? (
            <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p>
          ) : null}
        </div>
        <PlanningHubLoadingProgressRail className="mt-6" />
      </div>
    </div>
  );
}
