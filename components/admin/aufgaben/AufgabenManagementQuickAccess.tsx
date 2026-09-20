import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  TASK_MANAGEMENT_VIEW_LABELS,
  type TaskManagementView,
} from "@/lib/tasks/management-navigation";

type ViewLink = {
  view: TaskManagementView;
  href: string;
  active: boolean;
};

type Props = {
  viewLinks: ViewLink[];
};

export default function AufgabenManagementQuickAccess({ viewLinks }: Props) {
  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3"
      aria-label="Perspektiven"
      data-testid="aufgaben-quick-access"
    >
      <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Perspektive</h3>
      <ul className="space-y-0.5" role="list">
        {viewLinks.map((link) => (
          <li key={link.view}>
            <Link
              href={link.href}
              data-testid={`aufgaben-view-${link.view.toLowerCase()}`}
              aria-current={link.active ? "true" : undefined}
              className={cn(
                "block rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-2)]",
                link.active
                  ? "bg-[var(--surface-2)] font-semibold text-[var(--foreground)]"
                  : "text-[var(--text-2)]",
              )}
            >
              {TASK_MANAGEMENT_VIEW_LABELS[link.view]}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
