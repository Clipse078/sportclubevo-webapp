/** Format a FinanceYear boundary for `<input type="date">` (UTC calendar day). */
export function formatFinanceYearDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
