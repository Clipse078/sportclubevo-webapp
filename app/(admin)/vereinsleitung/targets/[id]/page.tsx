import Link from "next/link";
import {
  VEREINSLEITUNG_INNER_ROW_CLASS,
  VEREINSLEITUNG_PANEL_CLASS,
  VEREINSLEITUNG_SECONDARY_CHROME_LINK,
} from "@/components/admin/vereinsleitung/vereinsleitungSurfaceStyles";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTargetById } from "@/lib/targets/queries";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import TargetMetricProgress from "@/components/admin/targets/TargetMetricProgress";
import TargetDataPointForm from "@/components/admin/targets/TargetDataPointForm";
import TargetStageActions from "@/components/admin/targets/TargetStageActions";
import TargetLinksPanel from "@/components/admin/targets/TargetLinksPanel";
import TargetTasksSection from "@/components/admin/targets/TargetTasksSection";
import { loadTargetConnectedTasks } from "@/lib/club-development/target-connected-tasks";
import { loadTargetLinkedClubStrategy } from "@/lib/club-development/target-linked-club-strategy";
import {
  computeTargetDeliveryProgress,
  formatProgressCountLabel,
} from "@/lib/club-development/vereinsentwicklung-workspace-progress";
import { buildStrategieReturnHref } from "@/lib/club-development/vereinsentwicklung-create-routing";
import { resolveTargetCreatorDisplayName } from "@/lib/club-development/target-creator-display";
import { buildZielDetailHref } from "@/lib/club-development/vereinsentwicklung-target-task-create-routing";
import { parseOrgEinheitQuery } from "@/lib/club-development/vereinsentwicklung-workspace-org-filter";
import TargetDeleteButton from "@/components/admin/targets/TargetDeleteButton";
import ReviewStageBadge from "@/components/admin/shared/ReviewStageBadge";
import TargetMetricsEmptyState from "@/components/admin/targets/TargetMetricsEmptyState";
import { CD_TARGET_COPY } from "@/lib/club-development/product-copy";
import {
  TARGET_CATEGORY_LABELS,
  TARGET_STATUS_BADGE_CLASSES,
  formatTargetPeriodLabel,
  formatTargetStatusLabel,
} from "@/lib/targets/target-presentation";
import { PageShell } from "@/components/ui/page";
import { DetailPagePattern } from "@/components/ui/patterns";
import { Edit, ArrowLeft, Calendar, Tag } from "lucide-react";

function formatSwissDate(value: Date | string) {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ status?: string; created?: string; orgEinheit?: string }>;
};

export default async function TargetDetailPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const qp = (await searchParams) ?? {};
  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const target = await getTargetById(id, actor);

  if (!target) notFound();

  // Resolve permanent-delete authority for delete button visibility
  const tenantId = session.user?.activeTenantId;
  let canDelete = false;
  let canManageTarget = false;
  if (tenantId) {
    const resolver = createEffectivePermissionResolver(prisma);
    canDelete = await resolver.hasTenantDeletionAuthority({
      userId: session.user.id,
      permission: PERMISSIONS.TARGETS_DELETE,
      tenantId,
    });
    canManageTarget = actor.permissionKeys.includes(PERMISSIONS.TARGETS_MANAGE);
  }

  const statusLabel = formatTargetStatusLabel(target.status);
  const statusClasses =
    TARGET_STATUS_BADGE_CLASSES[target.status as keyof typeof TARGET_STATUS_BADGE_CLASSES] ??
    TARGET_STATUS_BADGE_CLASSES.DRAFT;
  const categoryLabel = TARGET_CATEGORY_LABELS[target.category] ?? target.category;
  const periodDisplay = formatTargetPeriodLabel(target.period, target.periodLabel);
  const orgUnitId = parseOrgEinheitQuery(qp);
  const detailReturnTo = buildZielDetailHref(id, orgUnitId);
  const canCreateTargetTasks =
    actor.permissionKeys.includes(PERMISSIONS.TARGETS_VIEW) &&
    actor.permissionKeys.includes(PERMISSIONS.TASKS_MANAGE);
  const [connectedTasks, creatorDisplayName, linkedStrategy, targetDelivery] = await Promise.all([
    loadTargetConnectedTasks(actor, id, detailReturnTo),
    tenantId ? resolveTargetCreatorDisplayName(tenantId, target.createdByUserId) : Promise.resolve(null),
    tenantId ? loadTargetLinkedClubStrategy(tenantId, id) : Promise.resolve(null),
    computeTargetDeliveryProgress(actor, id),
  ]);
  const targetDeliveryCaption = formatProgressCountLabel(targetDelivery);
  const targetDeliveryPercent =
    targetDelivery.totalCount > 0 ? targetDelivery.percent : 0;
  const linkedStrategyHref = linkedStrategy
    ? buildStrategieReturnHref({ orgUnitId, strategyId: linkedStrategy.id })
    : null;
  const showCreatedBanner = qp.created === "1";

  return (
    <PageShell fullWidth>
      <DetailPagePattern
        eyebrow="Ziele"
        title={target.title}
        description={target.description ?? undefined}
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Strategie & Ziele", href: "/vereinsleitung/strategie-und-ziele?ansicht=ziele" },
          { label: target.title },
        ]}
        headerBadge={
          <span
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${statusClasses}`}
            title={`${CD_TARGET_COPY.targetStatusLabel}: ${statusLabel}`}
          >
            {statusLabel}
          </span>
        }
        headerActions={
          <div className="flex items-center gap-2">
            {canDelete ? (
              <TargetDeleteButton targetId={id} targetTitle={target.title} />
            ) : null}
            <Link
              href="/vereinsleitung/targets"
              className={VEREINSLEITUNG_SECONDARY_CHROME_LINK}
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück
            </Link>
            <Link
              href={`/vereinsleitung/targets/${id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0b4aa2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#08357a]"
            >
              <Edit className="h-4 w-4" />
              Bearbeiten
            </Link>
          </div>
        }
      >
      {qp.status === "saved" ? (
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800">
          Änderungen wurden gespeichert.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className={VEREINSLEITUNG_PANEL_CLASS}>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-2)]">
                {categoryLabel}
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-2)]">
                {periodDisplay}
              </span>
              {target.ageGroupHint ? (
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-2)]">
                  {target.ageGroupHint}
                </span>
              ) : null}
              {target.requiresFourEyeReview ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
                  <ProductDomainSceIcon name="roles-access" size={12} />
                  4-Augen
                </span>
              ) : null}
            </div>

            {target.metrics.length === 0 ? (
              <TargetMetricsEmptyState targetId={id} canManage={canManageTarget} />
            ) : (
              <div className="space-y-8">
                {target.metrics.map((metric) => (
                  <div key={metric.id}>
                    <TargetMetricProgress
                      label={metric.label}
                      type={metric.type}
                      direction={metric.direction}
                      targetValue={metric.targetValue}
                      currentValue={metric.currentValue}
                      unit={metric.unit}
                    />

                    {metric.notes ? (
                      <p className="mt-2 text-[11px] text-[var(--text-2)]">{metric.notes}</p>
                    ) : null}

                    <div className="mt-3">
                      <TargetDataPointForm
                        targetId={id}
                        metricId={metric.id}
                        metricLabel={metric.label}
                        metricType={metric.type}
                        unit={metric.unit}
                      />
                    </div>

                    {metric.dataPoints.length > 0 ? (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Letzte Messwerte
                        </p>
                        {metric.dataPoints.slice(0, 5).map((dp) => (
                          <div
                            key={dp.id}
                            className={`flex items-center justify-between ${VEREINSLEITUNG_INNER_ROW_CLASS}`}
                          >
                            <span className="text-[12px] font-semibold text-[var(--foreground)]">
                              {dp.value}
                              {metric.unit ? ` ${metric.unit}` : ""}
                            </span>
                            <div className="flex items-center gap-3 text-[11px] text-[var(--text-2)]">
                              {dp.note ? <span>{dp.note}</span> : null}
                              <span>{formatSwissDate(dp.measuredAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          {linkedStrategy && linkedStrategyHref ? (
            <section className={VEREINSLEITUNG_PANEL_CLASS} data-testid="target-linked-strategie">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-2)]">
                Verknüpfte Strategie
              </p>
              <Link
                href={linkedStrategyHref}
                className="text-base font-semibold text-[var(--sce-primary)] hover:underline"
              >
                {linkedStrategy.title}
              </Link>
            </section>
          ) : null}

          <TargetTasksSection
            targetId={id}
            targetTitle={target.title}
            tasks={connectedTasks}
            canCreate={canCreateTargetTasks}
            returnTo={detailReturnTo}
            orgUnitId={orgUnitId}
            showCreatedBanner={showCreatedBanner}
            deliveryProgressCaption={targetDeliveryCaption}
            deliveryProgressPercent={targetDeliveryPercent}
          />
        </div>

        <aside className="space-y-5">
          <section className={VEREINSLEITUNG_PANEL_CLASS}>
            <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-2)]">
              Details
            </h3>
            <dl className="space-y-3">
              <div className="flex items-start gap-3">
                <Tag className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <dt className="text-[11px] text-slate-400">Kategorie</dt>
                  <dd className="text-sm font-medium text-[var(--foreground)]">{categoryLabel}</dd>
                </div>
              </div>

              <div>
                <dt className="text-[11px] text-slate-400 mb-1">{CD_TARGET_COPY.targetStatusLabel}</dt>
                <dd>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusClasses}`}
                  >
                    {statusLabel}
                  </span>
                </dd>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <dt className="text-[11px] text-slate-400">Zeitraum</dt>
                  <dd className="text-sm font-medium text-[var(--foreground)]">
                    {periodDisplay}
                    {target.startsAt && target.endsAt ? (
                      <span className="block text-[11px] font-normal text-[var(--text-2)]">
                        {formatSwissDate(target.startsAt)} – {formatSwissDate(target.endsAt)}
                      </span>
                    ) : null}
                  </dd>
                </div>
              </div>

              {target.sportCategory ? (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-slate-400 text-[13px]">⚽</span>
                  <div>
                    <dt className="text-[11px] text-slate-400">Sportkategorie</dt>
                    <dd className="text-sm font-medium text-[var(--foreground)]">{target.sportCategory}</dd>
                  </div>
                </div>
              ) : null}

              {creatorDisplayName ? (
                <div>
                  <dt className="text-[11px] text-slate-400 mb-1">{CD_TARGET_COPY.createdByLabel}</dt>
                  <dd className="text-sm font-medium text-[var(--foreground)]">{creatorDisplayName}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[11px] text-slate-400 mb-1">Erstellt</dt>
                <dd className="text-sm font-medium text-[var(--foreground)]">
                  {formatSwissDate(target.createdAt)}
                </dd>
              </div>
            </dl>
          </section>

          <section className={VEREINSLEITUNG_PANEL_CLASS}>
            <div className="mb-4 flex items-center gap-2">
              <ProductDomainSceIcon name="roles-access" size={16} className="h-4 w-4 text-slate-400" />
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-2)]">
                {CD_TARGET_COPY.governanceSection}
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-slate-400 mb-1.5">{CD_TARGET_COPY.reviewStatusLabel}</p>
                <ReviewStageBadge stage={target.reviewStage} />
              </div>

              {target.reviewedAt ? (
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">Geprüft am</p>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {formatSwissDate(target.reviewedAt)}
                  </p>
                </div>
              ) : null}

              <div>
                <p className="text-[11px] text-slate-400 mb-2">Statuswechsel</p>
                <TargetStageActions
                  targetId={id}
                  currentStage={target.reviewStage}
                />
              </div>
            </div>
          </section>

          {target.metrics.length > 0 ? (
            <section className={VEREINSLEITUNG_PANEL_CLASS}>
              <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-2)]">
                Fortschritt
              </h3>
              <div className="space-y-4">
                {target.metrics.map((metric) => (
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
              </div>
            </section>
          ) : null}

          <TargetLinksPanel targetId={id} linkedMeetingRefsRaw={target.linkedMeetingRefs} />
        </aside>
      </div>
      </DetailPagePattern>
    </PageShell>
  );
}
