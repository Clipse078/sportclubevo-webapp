import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getTrainingSession } from "@/lib/training/session-generation-service";
import { TrainingSessionNotFoundError } from "@/lib/training/errors";
import { listAllocationsByTrainingSeries } from "@/lib/training/training-allocation-service";
import { listAllocationsByTrainingSession } from "@/lib/training/session-allocation-service";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import TrainingCenterShell from "@/components/admin/training/TrainingCenterShell";
import { SectionCard } from "@/components/ui/page";
import { ToastProvider } from "@/components/ui/ToastProvider";
import TrainingSessionEditForm from "@/components/admin/training/TrainingSessionEditForm";
import { TrainingSessionAllocationEditor } from "@/components/admin/training/TrainingSessionAllocationEditor";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";

type Props = { params: Promise<{ sessionId: string }> };

function formatWallTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(new Date(iso));
}

function formatHeaderDate(date: string, locale: string, timezone: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(`${date}T12:00:00.000Z`));
}

export default async function TrainingSessionEditPage({ params }: Props) {
  const session = await requireAnyPermission([
    PERMISSIONS.TRAININGS_VIEW,
    PERMISSIONS.TRAININGS_MANAGE,
  ]);

  const tenantContext = await getActiveTenant();
  if (!tenantContext) notFound();

  const canManage = hasPermission(session, PERMISSIONS.TRAININGS_MANAGE);
  const { sessionId } = await params;

  let trainingSession;
  try {
    trainingSession = await getTrainingSession(tenantContext.id, sessionId);
  } catch (err) {
    if (err instanceof TrainingSessionNotFoundError) notFound();
    throw err;
  }

  if (trainingSession.status !== "SCHEDULED") notFound();

  const locale = tenantContext.locale ?? "de-CH";

  const [seriesAllocations, sessionAllocations, facilities] = await Promise.all([
    listAllocationsByTrainingSeries(tenantContext.id, trainingSession.trainingSeriesId),
    listAllocationsByTrainingSession(tenantContext.id, sessionId),
    getFacilitiesForTenant(tenantContext.id),
  ]);

  const facilityGroups: FacilityGroup[] = facilities
    .filter((f) => f.status !== "ARCHIVED")
    .map((f) => ({
      facilityId: f.id,
      facilityName: f.name,
      facilityType: f.type as string,
      resources: f.resources
        .filter((r) => r.status !== "ARCHIVED")
        .map((r) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          type: r.type,
          facilityId: f.id,
          facilityName: f.name,
          facilityType: f.type as string,
        })),
    }))
    .filter((fg) => fg.resources.length > 0);

  const dayHref = `/dashboard/training?tab=kalender&view=day&day=${trainingSession.date}`;
  const headerDate = formatHeaderDate(trainingSession.date, locale, trainingSession.timezone);

  return (
    <ToastProvider>
      <TrainingCenterShell
        variant="editor"
        activeTab="kalender"
        title="Einzeltraining bearbeiten"
        description={`${trainingSession.teamName} · ${headerDate}`}
        headerActions={
          <Link href={dayHref} className="fca-button-secondary text-sm">
            Zurück zum Tag
          </Link>
        }
      >
        <SectionCard>
          <TrainingSessionEditForm
            sessionId={trainingSession.id}
            canManage={canManage}
            isRescheduled={trainingSession.isRescheduled}
            effectiveDate={trainingSession.date}
            effectiveStartTime={formatWallTime(trainingSession.startAt, trainingSession.timezone)}
            effectiveEndTime={formatWallTime(trainingSession.endAt, trainingSession.timezone)}
            originalDate={trainingSession.originalDate}
            originalStartTime={formatWallTime(trainingSession.originalStartAt, trainingSession.timezone)}
            originalEndTime={formatWallTime(trainingSession.originalEndAt, trainingSession.timezone)}
            timezone={trainingSession.timezone}
            locale={locale}
          />
        </SectionCard>

        <SectionCard title="Ressourcen">
          <p className="mb-4 text-xs text-[var(--muted)]">
            Änderungen gelten nur für dieses Training.
          </p>
          <TrainingSessionAllocationEditor
            sessionId={trainingSession.id}
            initialAllocations={sessionAllocations}
            seriesAllocations={seriesAllocations}
            facilityGroups={facilityGroups}
            canManage={canManage}
            sessionStartAt={trainingSession.startAt}
            sessionEndAt={trainingSession.endAt}
          />
        </SectionCard>
      </TrainingCenterShell>
    </ToastProvider>
  );
}
