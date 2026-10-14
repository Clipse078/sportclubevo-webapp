import type { ReactNode } from "react";

type Props = {
  canCreate: boolean;
  activityCreateTrigger?: ReactNode;
};

export default function TurniereManagementQuickAccess({
  canCreate,
  activityCreateTrigger = null,
}: Props) {
  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3"
      aria-label="Schnellzugriff"
      data-testid="turniere-quick-access"
    >
      <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Schnellzugriff</h3>
      <ul className="space-y-1">
        {canCreate && activityCreateTrigger ? (
          <li data-testid="turniere-quick-create-menu">{activityCreateTrigger}</li>
        ) : null}
      </ul>
    </section>
  );
}
