"use client";

import PlanningHubLoadingProgressRail from "./PlanningHubLoadingProgressRail";
import PlanningHubLoadingRing from "./PlanningHubLoadingRing";
import PlanningHubLoadingStatus from "./PlanningHubLoadingStatus";
import styles from "./planning-hub-loading.module.css";

export type PlanningHubLoadingShellProps = {
  /** @deprecated Perspective-specific skeletons removed in PLANNING-HUB-03D2. */
  perspective?: string;
  /** @deprecated Chrome skeleton removed in PLANNING-HUB-03D2. */
  includeChromeSkeleton?: boolean;
};

export default function PlanningHubLoadingShell(_props: PlanningHubLoadingShellProps = {}) {
  return (
    <div
      className={styles.loadingWorkspace}
      data-testid="planning-hub-loading"
      aria-busy="true"
    >
      <div
        className={styles.loadingComposition}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <PlanningHubLoadingRing />
        <PlanningHubLoadingStatus className="mt-5 max-w-md" />
        <PlanningHubLoadingProgressRail className="mt-6" />
      </div>
    </div>
  );
}
