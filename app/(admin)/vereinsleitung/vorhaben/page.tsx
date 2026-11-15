import Link from "next/link";
import { ArrowRight, CheckSquare, ClipboardList, Flag, List } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import {
  CD_NAV_COPY,
  CD_VORHABEN_HUB_COPY,
} from "@/lib/club-development/product-copy";

const HUB_CARDS = [
  {
    title: CD_VORHABEN_HUB_COPY.initiativeListTitle,
    description: CD_VORHABEN_HUB_COPY.initiativeListDescription,
    href: "/vereinsleitung/initiativen",
    icon: List,
  },
  {
    title: CD_NAV_COPY.initiativeBacklog,
    description: "Priorisierte Vorhaben mit Einordnung und Erwartetem Ergebnis.",
    href: "/vereinsleitung/initiativen/backlog",
    icon: ClipboardList,
  },
  {
    title: CD_VORHABEN_HUB_COPY.taskInboxTitle,
    description: CD_VORHABEN_HUB_COPY.taskInboxDescription,
    href: "/dashboard/aufgaben",
    icon: CheckSquare,
  },
  {
    title: CD_NAV_COPY.implementationPlanning,
    description: "Umsetzungsphasen planen, Aufgaben zuordnen und Rückblick erfassen.",
    href: "/vereinsleitung/sprints",
    icon: Flag,
  },
] as const;

export default function VorhabenAufgabenPage() {
  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Vereinsentwicklung"
        title={CD_NAV_COPY.initiativesAndTasksHub}
        description={CD_VORHABEN_HUB_COPY.hubIntro}
        breadcrumbs={[
          { label: "Verein" },
          { label: "Vereinsentwicklung", href: "/vereinsleitung/club-entwicklung" },
          { label: CD_NAV_COPY.initiativesAndTasksHub },
        ]}
      >
        <p className="mb-6 max-w-3xl text-sm text-[var(--text-2)] leading-relaxed">
          «Vorhaben & Aufgaben» und «{CD_NAV_COPY.initiativeBacklog}» sind getrennte Einstiege:
          hier finden Sie Wege zu beiden; der gemeinsame Arbeitsbereich (CD-WORK) folgt in PKG-02.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {HUB_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.href}
                className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-xs)]"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-[var(--sce-primary)]" aria-hidden />
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">{card.title}</h2>
                  <Badge variant="success" size="sm">
                    Verfügbar
                  </Badge>
                </div>
                <p className="mt-2 flex-1 text-sm text-[var(--text-2)] leading-relaxed">
                  {card.description}
                </p>
                <Link
                  href={card.href}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--sce-primary)] hover:underline"
                >
                  Öffnen
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </article>
            );
          })}
        </div>
      </ListPagePattern>
    </PageShell>
  );
}