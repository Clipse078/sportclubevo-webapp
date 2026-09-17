"use client";

type PlanningHubLoadingStatusProps = {
  className?: string;
};

export default function PlanningHubLoadingStatus({ className }: PlanningHubLoadingStatusProps) {
  return (
    <div className={className} data-testid="planning-hub-loading-status">
      <p className="text-center text-xl font-semibold leading-tight tracking-tight text-[var(--foreground)]">
        Wochenplaner wird geladen …
      </p>
      <p className="mt-2.5 text-center text-sm leading-snug text-[var(--text-2)]">
        Trainings, Spiele und Ressourcen werden vorbereitet
      </p>
    </div>
  );
}
