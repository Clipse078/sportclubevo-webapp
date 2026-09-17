"use client";

import type { ReactNode } from "react";
import styles from "@/components/admin/planning-hub/loading/planning-hub-loading.module.css";

type PlannerWeekContentRevealProps = {
  children: ReactNode;
};

export default function PlannerWeekContentReveal({ children }: PlannerWeekContentRevealProps) {
  return (
    <div className={styles.plannerContentReveal} data-testid="planning-hub-planner-ready">
      {children}
    </div>
  );
}
