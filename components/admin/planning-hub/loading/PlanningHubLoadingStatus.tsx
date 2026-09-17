"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const LONG_WAIT_MS = 2000;

type PlanningHubLoadingStatusProps = {
  className?: string;
};

export default function PlanningHubLoadingStatus({ className }: PlanningHubLoadingStatusProps) {
  const [longWait, setLongWait] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setLongWait(true), LONG_WAIT_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="planning-hub-loading-status"
    >
      <div className="flex items-center gap-2 text-xs text-[var(--text-2)]">
        <Image
          src="/images/branding/sportclubevo_logo_alt.png"
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 shrink-0 opacity-70"
          aria-hidden
        />
        <span className="font-medium text-[var(--foreground)]">Wochenplanung wird geladen</span>
      </div>
      {longWait ? (
        <p className="mt-0.5 pl-6 text-[11px] text-[var(--text-2)]">
          Trainings, Spiele und Ressourcen werden vorbereitet
        </p>
      ) : null}
    </div>
  );
}
