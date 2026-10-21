import Link from "next/link";
import { cn } from "@/lib/cn";
import type { AufgabenWorkspaceTabId } from "@/lib/nav/aufgaben-workspace-tab-config";
import {
  buildAufgabenBereichHref,
  buildVerwaltungManagementHref,
} from "@/lib/personal-actions/aufgaben-scope";

type Props = {
  active: AufgabenWorkspaceTabId | "anforderungen";
  showMeine: boolean;
  showVerwaltung: boolean;
  basePath?: string;
};

/** Legacy scope toggle — prefer `AufgabenWorkspaceContextTabs` (DS-10 R4.2). */
export default function AufgabenScopeToggle({
  active,
  showMeine,
  showVerwaltung,
  basePath = "/dashboard/aufgaben",
}: Props) {
  if (!showMeine && !showVerwaltung) {
    return null;
  }

  const tabs: { id: AufgabenWorkspaceTabId; label: string; testId: string }[] = [
    ...(showMeine
      ? ([{ id: "meine" as const, label: "Meine Aufgaben", testId: "aufgaben-bereich-meine" }] as const)
      : []),
    ...(showVerwaltung
      ? ([{ id: "verwaltung" as const, label: "Verwaltung", testId: "aufgaben-bereich-verwaltung" }] as const)
      : []),
  ];

  const normalizedActive: AufgabenWorkspaceTabId =
    active === "anforderungen" ? "verwaltung" : active;

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 p-1"
      aria-label="Aufgaben-Bereich"
      data-testid="aufgaben-scope-toggle"
    >
      {tabs.map((tab) => {
        const isActive = normalizedActive === tab.id;
        const href =
          tab.id === "verwaltung" && active === "anforderungen"
            ? buildVerwaltungManagementHref("requirements", basePath)
            : buildAufgabenBereichHref(tab.id, basePath);
        return (
          <Link
            key={tab.id}
            href={href}
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
