/** Reserved grid track on Übersicht — alignment only, no placeholder copy. */
export default function VereinsentwicklungOverviewGridReservedSlot({
  testId,
}: {
  testId?: string;
}) {
  return (
    <div
      className="min-w-0"
      aria-hidden
      data-sce-overview-reserved="true"
      data-testid={testId}
    />
  );
}