import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { GoalSceIcon } from "@/components/icons/domain-sce-icon-components";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTargets } from "@/lib/targets/queries";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import TargetMetricProgress from "@/components/admin/targets/TargetMetricProgress";
import ReviewStageBadge from "@/components/admin/shared/ReviewStageBadge";
import CreateTargetTrigger from "@/components/admin/targets/CreateTargetTrigger";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

const CATEGORY_LABELS: Record<string, string> = {
  SPORTLICHE_ENTWICKLUNG: "Sportliche Entwicklung",
  MITGLIEDERWACHSTUM: "Mitgliederwachstum",
  FINANZEN: "Finanzen & Infrastruktur",
  AUSBILDUNG: "Ausbildung",
  MEDIEN_SOZIALES: "Medien & Soziales",
  GOVERNANCE: "Governance",
};

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  ACTIVE: {
    label: "Aktiv",
    classes: "border-[var(--sce-success-border)] bg-[var(--sce-success-light)] text-[var(--sce-success)]",
  },
  DRAFT: {
    label: "Entwurf",
    classes: "border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] text-[var(--sce-warning)]",
  },
  PAUSED: {
    label: "Pausiert",
    classes: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)]",
  },
  COMPLETED: {
    label: "Abgeschlossen",
    classes: "border-[var(--sce-info-border)] bg-[var(--sce-info-light)] text-[var(--sce-info)]",
  },
  CANCELLED: {
    label: "Abgebrochen",
    classes: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  },
};

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function TargetsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = (await searchParams) ?? {};
  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const targets = await getTargets(actor);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Ziele"
        title="Vereinsziele"
        description="Strategische Ziele und messbare Fortschrittskennzahlen für den Verein."
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Vereinsziele" },
        ]}
        headerActions={<CreateTargetTrigger />}
        isEmpty={targets.length === 0}
        emptyIcon={<GoalSceIcon className="h-10 w-10 text-[var(--muted)]" />}
        emptyHeading="Noch keine Ziele erfasst"
        emptyDescription="Erstelle das erste strategische Vereinsziel."
        emptyAction={<CreateTargetTrigger label="Erstes Ziel erstellen" />}
      >
        {params.status === "saved" ? (
          <div className="mb-4 rounded-xl border border-[var(--sce-success-border)] bg-[var(--sce-success-light)] px-4 py-3 text-sm font-medium text-[var(--sce-success)]">
            Ziel wurde erfolgreich gespeichert.
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-2">
          {targets.map((target) => {
            const statusInfo = STATUS_LABELS[target.status] ?? STATUS_LABELS.DRAFT;
            const categoryLabel = CATEGORY_LABELS[target.category] ?? target.category;
            const firstMetrics = target.metrics.slice(0, 2);

            return (
              <Link
                key={target.id}
                href={`/vereinsleitung/targets/${target.id}`}
                className="block rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/80 p-6 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      {categoryLabel}
                    </p>
                    <h3 className="mt-1 text-base font-semibold leading-6 text-[var(--text-1)]">
                      {target.title}
                    </h3>
                    {target.description ? (
                      <p className="mt-1.5 line-clamp-2 text-sm text-[var(--text-2)]">
                        {target.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${statusInfo.classes}`}
                    >
                      {statusInfo.label}
                    </span>
                    <ReviewStageBadge stage={target.reviewStage} size="sm" />
                  </div>
                </div>

                {firstMetrics.length > 0 ? (
                  <div className="mt-5 space-y-4">
                    {firstMetrics.map((metric) => (
                      <TargetMetricProgress
                        key={metric.id}
                        label={metric.label}
                        type={metric.type}
                        direction={metric.direction}
                        targetValue={metric.targetValue}
                        currentValue={metric.currentValue}
                        unit={metric.unit}
                      />
                    ))}

                    {target.metrics.length > 2 ? (
                      <p className="text-[11px] text-[var(--muted)]">
                        +{target.metrics.length - 2} weitere Metrik
                        {target.metrics.length - 2 === 1 ? "" : "en"}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                  <span>
                    {target.metrics.length} Metrik{target.metrics.length !== 1 ? "en" : ""}
                  </span>
                  {target.periodLabel ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{target.periodLabel}</span>
                    </>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </ListPagePattern>
    </PageShell>
  );
}
