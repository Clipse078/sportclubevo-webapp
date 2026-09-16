/**
 * PLANNING-HUB-02E — planner-shaped skeleton for initial RSC load.
 */
export default function PlannerWeekLoading() {
  return (
    <div className="space-y-2 animate-pulse" data-testid="planning-hub-loading">
      <div className="space-y-2 border-b border-[var(--border)] pb-2">
        <div className="h-5 w-32 rounded bg-[var(--surface-2)]" />
        <div className="flex gap-2">
          <div className="h-7 w-7 rounded-md bg-[var(--surface-2)]" />
          <div className="h-7 w-40 rounded bg-[var(--surface-2)]" />
          <div className="h-7 w-7 rounded-md bg-[var(--surface-2)]" />
        </div>
        <div className="flex gap-2 pt-1">
          <div className="h-7 w-48 rounded-md bg-[var(--surface-2)]" />
          <div className="h-7 flex-1 max-w-xs rounded-md bg-[var(--surface-2)]" />
        </div>
      </div>
      <div className="h-9 rounded-md bg-[var(--surface-2)]" />
      <div className="grid min-h-[420px] grid-cols-8 gap-px rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40 p-1">
        <div className="col-span-1 bg-[var(--surface)]" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="col-span-1 space-y-1 bg-[var(--surface)] p-1">
            <div className="mx-auto h-3 w-8 rounded bg-[var(--surface-2)]" />
            <div className="mx-auto h-4 w-6 rounded bg-[var(--surface-2)]" />
            <div className="mt-4 h-24 rounded bg-[var(--surface-2)]/80" />
          </div>
        ))}
      </div>
    </div>
  );
}
