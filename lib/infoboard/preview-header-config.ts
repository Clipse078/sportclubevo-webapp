import type { InfoboardScreen1Props } from "@/components/infoboard/screen1/InfoboardScreen1";
import type { InboardRow } from "@/lib/infoboard/types";
import type { InfoboardScreen1LivePayload } from "@/lib/publishing/infoboard/screen1-live-service";
import type { InfoboardDisplayTheme } from "@/lib/publishing/infoboard/display-theme";
import { isVenueDisplayLightTheme } from "@/lib/infoboard/venue-display-grid";
type PreviewHeaderTenant = { readonly key: string };

/** Preview-only contextual headings for venue-display LIGHT UAT (not product defaults). */
const PREVIEW_VENUE_PAGE_HEADING_BY_TENANT_KEY: Readonly<
  Record<string, string>
> = {
  "fc-allschwil": "HEUTE IM BRÜEL",
};

function resolvePreviewVenuePageHeadingFallback(
  tenant: PreviewHeaderTenant,
): string | null {
  const configured = PREVIEW_VENUE_PAGE_HEADING_BY_TENANT_KEY[tenant.key];
  return configured?.trim() ? configured.trim() : null;
}

/**
 * Ensures LIGHT Preview UAT can show contextual venue headings without DB fields.
 */
export function enrichPreviewScreen1HeaderConfig(params: {
  readonly headerConfig: InfoboardScreen1LivePayload["headerConfig"];
  readonly theme: InfoboardDisplayTheme;
  readonly tenant: PreviewHeaderTenant;
  readonly board: InboardRow | null;
}): InfoboardScreen1Props["headerConfig"] | undefined {
  const { headerConfig, theme, tenant, board } = params;
  if (!isVenueDisplayLightTheme(theme)) {
    return headerConfig ?? undefined;
  }

  const base =
    headerConfig ??
    (board != null
      ? {
          subtitleEnabled: board.headerSubtitleEnabled !== false,
          subtitleText: board.headerSubtitleText ?? null,
          showTime: board.headerShowTime !== false,
          showDate: board.headerShowDate !== false,
          showWeather: board.headerShowWeather === true,
        }
      : null);

  if (base == null) {
    const fallbackHeading = resolvePreviewVenuePageHeadingFallback(tenant);
    return fallbackHeading != null
      ? { subtitleEnabled: false, subtitleText: null, pageHeadingText: fallbackHeading }
      : undefined;
  }

  const existingHeading = (base as { pageHeadingText?: string | null }).pageHeadingText?.trim();
  if (existingHeading) {
    return base as InfoboardScreen1Props["headerConfig"];
  }

  const fallbackHeading = resolvePreviewVenuePageHeadingFallback(tenant);
  if (fallbackHeading == null) {
    return base as InfoboardScreen1Props["headerConfig"];
  }

  return {
    ...base,
    pageHeadingText: fallbackHeading,
  };
}
