import Link from "next/link";
import { Plus } from "lucide-react";

export default function CreateProcessTrigger() {
  return (
    <Link
      href="/vereinsleitung/prozesse/new"
      data-testid="process-create-link"
      className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--sce-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
    >
      <Plus className="h-4 w-4" />
      Neuer Prozess
    </Link>
  );
}
