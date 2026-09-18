import Link from "next/link";
import { Plus } from "lucide-react";

type Props = {
  canManage: boolean;
  createHref?: string;
};

export default function VeranstaltungenManagementQuickAccess({
  canManage,
  createHref = "/dashboard/veranstaltungen/new",
}: Props) {
  if (!canManage) return null;

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3"
      aria-label="Schnellzugriff"
      data-testid="veranstaltungen-quick-access"
    >
      <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Schnellzugriff</h3>
      <Link
        href={createHref}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
        data-testid="veranstaltungen-quick-create"
      >
        <Plus className="h-4 w-4 text-[var(--sce-primary)]" aria-hidden="true" />
        Veranstaltung erstellen
      </Link>
    </section>
  );
}
