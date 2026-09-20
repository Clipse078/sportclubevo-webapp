import Link from "next/link";
import { cn } from "@/lib/cn";
import type { AufgabenBereich } from "@/lib/personal-actions/aufgaben-scope";
import { buildAufgabenBereichHref } from "@/lib/personal-actions/aufgaben-scope";

type Props = {
  active: AufgabenBereich;
  showManagement: boolean;
  basePath?: string;
};

export default function AufgabenScopeToggle({
  active,
  showManagement,
  basePath = "/dashboard/aufgaben",
}: Props) {
  if (!showManagement) {
    return null;
  }

  const tabs: { id: AufgabenBereich; label: string; testId: string }[] = [
    { id: "meine", label: "Meine Aufgaben", testId: "aufgaben-bereich-meine" },
    { id: "verwaltung", label: "Aufgabenverwaltung", testId: "aufgaben-bereich-verwaltung" },
  ];

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 p-1"
      aria-label="Aufgaben-Bereich"
      data-testid="aufgaben-scope-toggle"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={buildAufgabenBereichHref(tab.id, basePath)}
            data-testid={tab.testId}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-[var(--surface-2)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--text-2)] hover:bg-[var(--surface-2)]/70 hover:text-[var(--foreground)]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
