import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  canCreate: boolean;
  wochenplanerHref: string;
  activityCreateTrigger?: ReactNode;
};

export default function TrainingManagementQuickAccess({
  canCreate,
  wochenplanerHref,
  activityCreateTrigger = null,
}: Props) {
  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3"
      aria-label="Schnellzugriff"
      data-testid="training-quick-access"
    >
      <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Schnellzugriff</h3>
      <ul className="space-y-1">
        {canCreate && activityCreateTrigger ? (
          <li data-testid="training-quick-create-menu">{activityCreateTrigger}</li>
        ) : null}
        <li>
          <Link
            href={wochenplanerHref}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            data-testid="training-quick-wochenplaner"
          >
            <CalendarDays className="h-4 w-4 text-[var(--sce-primary)]" aria-hidden="true" />
            Wochenplaner öffnen
          </Link>
        </li>
      </ul>
    </section>
  );
}
