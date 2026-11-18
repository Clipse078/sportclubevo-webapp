import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  PreviewFrameScreen1,
  PreviewFrameScreen2,
  PreviewFrameAnlageplan,
} from "@/components/infoboard/preview/PreviewFrame";
import {
  buildScreen1PreviewData,
  buildScreen2PreviewData,
} from "@/lib/infoboard/preview-data";
import { parseInfoboardPreviewDisplayTheme } from "@/lib/infoboard/preview-display-theme";
import { parseInfoboardPreviewMoment } from "@/lib/infoboard/preview-time";
import { InfoboardPreviewEmbedState } from "@/components/infoboard/preview/InfoboardPreviewEmbedState";
import { INFOBOARD_READ_PERMISSIONS } from "@/lib/permissions/content-view-permissions";
import { resolveRequestAnyPermission } from "@/lib/permissions/resolve-request-any-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";

export const metadata: Metadata = {
  title: "Infoboard Vorschau",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function InfoboardPreviewFramePage({
  searchParams,
}: PageProps) {
  const access = await resolveRequestAnyPermission([...INFOBOARD_READ_PERMISSIONS]);
  if (access.kind !== "granted") {
    return (
      <InfoboardPreviewEmbedState
        kind={access.kind === "unauthenticated" ? "unauthenticated" : "forbidden"}
      />
    );
  }

  const tenant = await getActiveTenant();
  if (!tenant?.timezone) notFound();
  const previewTenant = { ...tenant, timezone: tenant.timezone };

  const params = await searchParams;
  const preview = parseInfoboardPreviewMoment(
    {
      screen: first(params.screen),
      date: first(params.date),
      time: first(params.time),
    },
    tenant.timezone,
  );

  if (preview.screen === "1") {
    const displayThemeQuery = first(params.displayTheme);
    const previewBuildOptions =
      displayThemeQuery != null && displayThemeQuery.trim() !== ""
        ? {
            displayThemeOverride: parseInfoboardPreviewDisplayTheme(
              displayThemeQuery,
              null,
            ),
          }
        : undefined;
    const { payload, weather, headerConfig } = await buildScreen1PreviewData(
      previewTenant,
      preview.now,
      previewBuildOptions,
    );
    return (
      <PreviewFrameScreen1
        feed={payload.feed}
        branding={payload.branding}
        currentTimeIso={payload.currentTimeIso}
        weather={weather}
        announcement={payload.announcement ?? undefined}
        eventPresentation={payload.eventPresentation}
        theme={payload.theme}
        headerConfig={headerConfig ?? payload.headerConfig ?? undefined}
        presentation={payload.presentation ?? undefined}
        studio={payload.studio ?? undefined}
        autoRotate={first(params.auto) === "1"}
      />
    );
  }

  const data = await buildScreen2PreviewData(previewTenant, preview.now);
  if (data.renderer === "anlageplan") {
    return (
      <PreviewFrameAnlageplan
        payload={data.payload}
        weather={data.weather}
        shellConfig={data.shellConfig}
        branding={data.branding}
        tenantKey={data.tenantKey}
        transport={data.transport}
        liveClock={false}
      />
    );
  }

  return (
    <PreviewFrameScreen2
      feed={data.payload.feed}
      branding={data.payload.branding}
      currentTimeIso={data.payload.currentTimeIso}
      weather={data.weather}
      theme={data.payload.theme}
    />
  );
}
