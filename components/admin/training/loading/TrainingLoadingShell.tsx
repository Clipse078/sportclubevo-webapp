"use client";

import PlanningHubLoadingProgressRail from "@/components/admin/planning-hub/loading/PlanningHubLoadingProgressRail";
import PlanningHubLoadingRing from "@/components/admin/planning-hub/loading/PlanningHubLoadingRing";
import styles from "@/components/admin/planning-hub/loading/planning-hub-loading.module.css";

export default function TrainingLoadingShell() {
  return (
    <div className={styles.loadingWorkspace} data-testid="training-management-loading" aria-busy="true">
      <div className={styles.loadingComposition} role="status" aria-live="polite" aria-busy="true">
        <PlanningHubLoadingRing />
        <div className="mt-5 max-w-md text-center">
          <p className="text-sm font-semibold text-[var(--foreground)]">Trainings werden geladen …</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Serien und Einzeltrainings werden vorbereitet</p>
        </div>
        <PlanningHubLoadingProgressRail className="mt-6" />
      </div>
    </div>
  );
}
