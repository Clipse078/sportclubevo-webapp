import type { ReactNode } from "react";

type Props = {
  canManage: boolean;
  activityCreateTrigger?: ReactNode;
};

export default function VeranstaltungenManagementQuickAccess({
  canManage,
  activityCreateTrigger = null,
}: Props) {
  if (!canManage || !activityCreateTrigger) return null;

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3"
      aria-label="Schnellzugriff"
      data-testid="veranstaltungen-quick-access"
    >
      <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Schnellzugriff</h3>
      <div data-testid="veranstaltungen-quick-create-menu">{activityCreateTrigger}</div>
    </section>
  );
}
