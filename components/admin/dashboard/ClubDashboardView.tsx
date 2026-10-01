import { Suspense } from "react";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getPersonalizedGreeting, resolveDashboardFirstName } from "@/lib/dashboard/greeting";
import { getPersonFirstNameByUserId } from "@/lib/people/queries";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import {
  PersonalDashboardCockpitGreeting,
} from "@/components/ui/dashboard";
import { getUserDashboardHeroState } from "@/lib/dashboard/dashboard-hero-image";
import type { HeroImageTransform } from "@/lib/dashboard/dashboard-hero-position";
import { formatTodayDate } from "@/lib/tenant-runtime/formatters";
import type { PermissionKey } from "@/lib/permissions/permissions";
import {
  logSceHotfixLogin01Step,
  logSceHotfixLogin01StepDone,
  runWithSceHotfixLogin01Trace,
  sceHotfixLogin01TraceEnabled,
} from "@/lib/incident/sce-hotfix-login-01-trace";
import ClubDashboardCommandCenterAsync from "./ClubDashboardCommandCenterAsync";
import { ClubDashboardCommandCenterSkeleton } from "./ClubDashboardCommandCenterSkeleton";

type ClubDashboardViewProps = {
  calendarMonthParam?: string | null;
  /** When provided by the dashboard page, avoids a second auth() round-trip. */
  authenticatedSession?: Session | null;
};

export default async function ClubDashboardView({
  calendarMonthParam = null,
  authenticatedSession,
}: ClubDashboardViewProps) {
  if (sceHotfixLogin01TraceEnabled()) {
    logSceHotfixLogin01Step("tenant");
  }
  const session = authenticatedSession ?? (await auth());
  const ctx = await getActiveTenant();
  if (sceHotfixLogin01TraceEnabled()) {
    logSceHotfixLogin01StepDone("tenant");
  }
  const tenantId = ctx?.id;

  const actor =
    session?.user && tenantId
      ? await getActorContext(session.user, tenantId)
      : null;

  const linkedPersonFirstName = session?.user?.id
    ? await runWithSceHotfixLogin01Trace("person-first-name", () =>
        getPersonFirstNameByUserId(session.user!.id),
      )
    : null;

  const firstName = resolveDashboardFirstName({
    linkedPersonFirstName,
    sessionFirstName: session?.user?.firstName,
    tenantName: ctx?.name,
  });

  const fmtCfg = {
    locale: ctx?.locale ?? "de-CH",
    timezone: ctx?.timezone ?? undefined,
  };

  const permissionKeys = (actor?.permissionKeys ??
    session?.user?.permissionKeys ??
    []) as PermissionKey[];

  const todayFormatted = formatTodayDate(fmtCfg);
  const greeting = getPersonalizedGreeting(firstName);
  const displayName = firstName?.trim() || undefined;

  const heroState = session?.user?.id
    ? await runWithSceHotfixLogin01Trace("hero-state", () =>
        getUserDashboardHeroState(session.user!.id),
      )
    : null;

  const heroTransform: HeroImageTransform | undefined = heroState
    ? {
        zoom: heroState.zoom,
        positionX: heroState.positionX,
        positionY: heroState.positionY,
      }
    : undefined;

  const contextLine = [todayFormatted, ctx?.name].filter(Boolean).join(" · ");

  return (
    <div
      className="mx-auto flex w-full min-w-0 max-w-[1400px] flex-col gap-2.5 lg:gap-3"
      data-testid="personal-command-center"
    >
      <PersonalDashboardCockpitGreeting
        greeting={greeting}
        highlightName={displayName}
        contextLine={contextLine}
        initialBackgroundImageUrl={heroState?.imageUrl ?? null}
        initialBackgroundTransform={heroTransform}
      />

      {tenantId && session?.user?.id ? (
        <Suspense fallback={<ClubDashboardCommandCenterSkeleton />}>
          <ClubDashboardCommandCenterAsync
            tenantId={tenantId}
            userId={session.user.id}
            actor={actor}
            fmtCfg={fmtCfg}
            permissionKeys={permissionKeys}
            calendarMonthParam={calendarMonthParam}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
