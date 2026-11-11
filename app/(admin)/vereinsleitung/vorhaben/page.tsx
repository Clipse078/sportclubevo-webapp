import Link from "next/link";
import { ArrowRight, CheckSquare, Flag } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

export default function VorhabenAufgabenPage() {
  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Vereinsentwicklung"
        title="Vorhaben & Aufgaben"
        description="Ein gemeinsamer Arbeitsbereich für strategische Vorhaben und zugehörige Aufgaben wird vorbereitet (SCE-CD-WORK)."
        breadcrumbs={[
          { label: "Verein" },
          { label: "Vereinsentwicklung", href: "/vereinsleitung/club-entwicklung" },
          { label: "Vorhaben & Aufgaben" },
        ]}
      >
        <div className="mb-6 flex items-center gap-2">
          <Badge variant="warning" size="sm">
            In Arbeit
          </Badge>
          <p className="text-sm text-[var(--text-2)]">
            Bis der dedizierte Bereich verfügbar ist, nutzen Sie die bestehenden Module.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
          <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-xs)]">
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-[var(--sce-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Initiativen</h2>
              <Badge variant="success" size="sm">
                Verfügbar
              </Badge>
            </div>
            <p className="mt-2 text-sm text-[var(--text-2)] leading-relaxed">
              Strategische Entwicklungsvorhaben mit Fortschritt, Verantwortlichen und
              Sichtbarkeitssteuerung.
            </p>
            <Link
              href="/vereinsleitung/initiativen"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--sce-primary)] hover:underline"
            >
              Zu Initiativen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-xs)]">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-[var(--sce-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Aufgaben</h2>
              <Badge variant="success" size="sm">
                Verfügbar
              </Badge>
            </div>
            <p className="mt-2 text-sm text-[var(--text-2)] leading-relaxed">
              Operative Aufgaben und Zuweisungen im zentralen Aufgaben-Bereich.
            </p>
            <Link
              href="/dashboard/aufgaben"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--sce-primary)] hover:underline"
            >
              Zu Aufgaben
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </div>
      </ListPagePattern>
    </PageShell>
  );
}
