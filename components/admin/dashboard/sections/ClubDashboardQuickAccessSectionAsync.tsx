import type { ReactNode } from "react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { ReportSceIcon } from "@/components/icons/domain-sce-icon-components";
import { CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PersonalQuickAccess, PersonalDashboardSecondary } from "@/components/ui/dashboard";
import type { DashboardActivityItem } from "@/components/ui/dashboard";
import { formatSecondaryActivityPresentation } from "@/lib/dashboard/secondary-activity-presentation";
import type { PersonalDashboardSecondaryActivity } from "@/lib/dashboard/secondary-activity-facts";
import { resolvePersonalQuickAccess } from "@/lib/dashboard/quick-access/resolve-quick-access";
import { getQuickAccessLabel } from "@/lib/dashboard/quick-access/labels";
import { QUICK_ACCESS_MAX_PINS } from "@/lib/dashboard/quick-access/constants";
import SceActivityCreateMenu from "@/components/sce/activity-create/SceActivityCreateMenu";
import { buildSceActivityCreateMenuProps } from "@/lib/sce/activity-create/build-activity-create-menu-props.server";
import {
  resolveSceActivityCreatePermissionsFromFlags,
  sceActivityCreatePermissionsHasAny,
} from "@/lib/sce/activity-create/activity-create-permissions";
import { getTenantClubCrestUrlCached } from "@/lib/server/request-cache";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { formatDate } from "@/lib/tenant-runtime/formatters";
import { loadPersonalDashboardSecondarySectionOutcome } from "@/lib/dashboard/personal-dashboard-section-status";
import { PersonalDashboardSectionRetry } from "../PersonalDashboardSectionRetry";
import {
  toPersonalDashboardSectionContext,
  type ClubDashboardSectionsBaseProps,
} from "./ClubDashboardSectionContext";

export default async function ClubDashboardQuickAccessSectionAsync(
  props: ClubDashboardSectionsBaseProps,
) {
  const tSecondary = await getTranslations("PersonalDashboard.secondary");
  const tSection = await getTranslations("PersonalDashboard.sectionStatus");
  const locale = props.fmtCfg.locale ?? "de-CH";

  const quickAccessBundle = await resolvePersonalQuickAccess({
    tenantId: props.tenantId,
    userId: props.userId,
    permissionKeys: props.permissionKeys,
    locale,
  });

  const secondaryOutcome = await loadPersonalDashboardSecondarySectionOutcome(
    toPersonalDashboardSectionContext(props),
  );

  const activityTagMap: Record<
    PersonalDashboardSecondaryActivity["kind"],
    { tag: string; tagVariant: DashboardActivityItem["tagVariant"]; icon: ReactNode }
  > = {
    news: {
      tag: tSecondary("tagNews"),
      tagVariant: "info",
      icon: <ProductDomainSceIcon name="news" size={12} />,
    },
    registration: {
      tag: tSecondary("tagRegistration"),
      tagVariant: "warning",
      icon: <ProductDomainSceIcon name="people" size={12} />,
    },
    event: {
      tag: tSecondary("tagPlanning"),
      tagVariant: "success",
      icon: <CalendarDays className="h-3.5 w-3.5" />,
    },
    meeting: {
      tag: tSecondary("tagMeeting"),
      tagVariant: "primary",
      icon: <ReportSceIcon className="h-3.5 w-3.5" />,
    },
  };

  const secondary =
    secondaryOutcome.kind === "success"
      ? secondaryOutcome.data
      : { newsItems: [], activitySources: [] };

  const activityItems: DashboardActivityItem[] = secondary.activitySources.map((entry) => {
    const meta = activityTagMap[entry.kind];
    const presentation = formatSecondaryActivityPresentation(entry, (key, values) =>
      tSecondary(key, values ?? {}),
    );
    return {
      key: entry.key,
      icon: meta.icon,
      title: presentation.title,
      subtitle: presentation.subtitle,
      timestamp: formatDate(entry.date, props.fmtCfg),
      tag: meta.tag,
      tagVariant: meta.tagVariant,
    };
  });

  const canManageTrainings = props.permissionKeys.includes(PERMISSIONS.TRAININGS_MANAGE);
  const canManageEvents = props.permissionKeys.includes(PERMISSIONS.EVENTS_MANAGE);
  const createPermissions = resolveSceActivityCreatePermissionsFromFlags({
    canManageTrainings,
    canManageEvents,
  });

  let dashboardCreateMenu: ReactNode = null;
  if (sceActivityCreatePermissionsHasAny(createPermissions)) {
    const tenantLogoUrl = await getTenantClubCrestUrlCached(props.tenantId);
    const menuProps = await buildSceActivityCreateMenuProps({
      tenantId: props.tenantId,
      userId: props.userId,
      timeZone: props.fmtCfg.timezone ?? "Europe/Zurich",
      tenantClubName: props.tenantClubName,
      tenantLogoUrl,
      permissions: createPermissions,
    });
    dashboardCreateMenu = (
      <SceActivityCreateMenu
        {...menuProps}
        presentation="dashboard-strip"
        hostOriginContext={{ kind: "DASHBOARD", pathname: "/dashboard" }}
      />
    );
  }

  return (
    <>
      <PersonalQuickAccess
        initialItems={quickAccessBundle.items.filter((item) => item.kind === "navigate")}
        initialActiveKeys={quickAccessBundle.activeKeys.filter(
          (key) => !key.startsWith("action.create-"),
        )}
        customizeCatalog={quickAccessBundle.catalog
          .filter((entry) => entry.kind === "NAVIGATION")
          .map((entry) => ({
            key: entry.key,
            kind: "navigate" as const,
            label: getQuickAccessLabel(entry, locale),
            href: entry.href,
          }))}
        maxPins={QUICK_ACCESS_MAX_PINS}
        createMenu={dashboardCreateMenu}
      />
      {secondaryOutcome.kind === "failed" ? (
        <PersonalDashboardSectionRetry
          title={tSection("loadFailedTitle")}
          description={tSection("secondaryFailed")}
          testId="personal-dashboard-secondary-error"
        />
      ) : (
        <PersonalDashboardSecondary
          newsItems={secondary.newsItems}
          activityItems={activityItems}
        />
      )}
    </>
  );
}