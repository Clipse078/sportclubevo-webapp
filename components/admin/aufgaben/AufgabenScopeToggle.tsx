import Link from "next/link";
import { cn } from "@/lib/cn";
import type { AufgabenBereich } from "@/lib/personal-actions/aufgaben-scope";
import { buildAufgabenBereichHref } from "@/lib/personal-actions/aufgaben-scope";

type Props = {
  active: AufgabenBereich;
  showManagement: boolean;
  showRequirements?: boolean;
  basePath?: string;
};

export default function AufgabenScopeToggle({
  active,
  showManagement,
  showRequirements = false,
  basePath = "/dashboard/aufgaben",
}: Props) {
  if (!showManagement && !showRequirements) {
    return null;
  }

  const tabs: { id: AufgabenBereich; label: string; testId: string }[] = [
    ...(showManagement
      ? ([
          { id: "meine" as const, label: "Meine Aufgaben", testId: "aufgaben-bereich-meine" },
          {
            id: "verwaltung" as const,
            label: "Aufgabenverwaltung",
            testId: "aufgaben-bereich-verwaltung",
          },
        ] as const)
      : []),
    ...(showRequirements
      ? ([
          {
            id: "anforderungen" as const,
            label: "Anforderungen",
            testId: "aufgaben-bereich-anforderungen",
          },
        ] as const)
      : []),
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
