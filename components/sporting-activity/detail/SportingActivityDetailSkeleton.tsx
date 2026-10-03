export function SportingActivityDetailSkeleton() {
  return (
    <div
      className="animate-pulse space-y-4"
      data-testid="sporting-activity-detail-skeleton"
      aria-busy="true"
      aria-label="Aktivität wird geladen"
    >
      <div className="h-5 w-24 rounded bg-[var(--surface-2)]" />
      <div className="h-7 w-3/4 max-w-sm rounded bg-[var(--surface-2)]" />
      <div className="h-4 w-1/2 max-w-xs rounded bg-[var(--surface-2)]" />
      <div className="space-y-2 pt-2">
        <div className="h-3 w-full max-w-md rounded bg-[var(--surface-2)]" />
        <div className="h-3 w-2/3 max-w-sm rounded bg-[var(--surface-2)]" />
      </div>
    </div>
  );
}
