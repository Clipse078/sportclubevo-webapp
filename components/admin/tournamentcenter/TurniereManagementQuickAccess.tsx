import Link from "next/link";
import { Plus } from "lucide-react";

type Props = {
  canCreate: boolean;
  createHref: string;
};

export default function TurniereManagementQuickAccess({ canCreate, createHref }: Props) {
  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3"
      aria-label="Schnellzugriff"
      data-testid="turniere-quick-access"
    >
      <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Schnellzugriff</h3>
      <ul className="space-y-1">
        {canCreate ? (
          <li>
            <Link
              href={createHref}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              data-testid="turniere-quick-create"
            >
              <Plus className="h-4 w-4 text-[var(--sce-primary)]" aria-hidden="true" />
              Turnier erstellen
            </Link>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
