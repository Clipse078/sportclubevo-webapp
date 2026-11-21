/** Reserved grid track on Übersicht — alignment only, no placeholder copy. */
export default function VereinsentwicklungOverviewGridReservedSlot({
  testId,
  column,
}: {
  testId?: string;
  column?: "status" | "progress" | "verantwortlich";
}) {
  return (
    <div
      className="min-w-0 w-full"
      aria-hidden
      data-sce-overview-reserved="true"
      data-sce-overview-col={column}
      data-testid={testId}
    />
  );
}