import Link from "next/link";
import { Clock } from "lucide-react";

type Props = {
  canManageFacilities: boolean;
  label: string;
  href?: string;
};

const DEFAULT_HREF = "/dashboard/admin/facilities";

export default function PlanningEditorZeitstandardLink({
  canManageFacilities,
  label,
  href = DEFAULT_HREF,
}: Props) {
  if (!canManageFacilities) {
    return null;
  }

  return (
    <p className="text-xs text-[var(--text-2)]" data-testid="planning-zeitstandard-link">
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 font-medium text-[var(--foreground)] underline-offset-2 hover:underline"
      >
        <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
        {label}
      </Link>
    </p>
  );
}
