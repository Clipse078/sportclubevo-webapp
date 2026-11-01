/**
 * components/infoboard/shared/KioskShellHeader.tsx
 *
 * Canonical shared kiosk header for all public Infoboards.
 *
 * Physical-TV information architecture:
 *
 *   CLUB | CLOCK / DATE | WEATHER | ALEXA SAFE ZONE
 *
 * The final Alexa zone is permanently empty and reserves approximately
 * 10% of the viewport for the external Fully Kiosk / Alexa overlay.
 *
 * Weather is supporting information and never occupies the Alexa zone.
 *
 * Invariants:
 *   - Pure presentational component: no fetch, DB or implicit time.
 *   - Existing header height is preserved.
 *   - LiveClockScreen1 remains the canonical kiosk clock.
 *   - Weather is provider-neutral WeatherResult data.
 *   - Unavailable weather is silently omitted.
 *   - MeteoSwiss attribution is rendered whenever weather is shown.
 */

import type { ReactElement, ReactNode } from "react";
import { LiveKioskShellWeather } from "@/components/infoboard/shared/LiveKioskShellWeather";
import { KioskShellWeatherDisplay } from "@/components/infoboard/shared/KioskShellWeatherDisplay";

import { LiveClockScreen1 } from "@/components/infoboard/screen1/LiveClockScreen1";
import {
  KIOSK_SHELL_CSS_VARS,
  KIOSK_SHELL_ALEXA_SAFE_ZONE_WIDTH_PX,
  KIOSK_SHELL_WEATHER_ZONE_MAX_WIDTH_PX,
  KIOSK_SHELL_WEATHER_ZONE_MIN_WIDTH_PX,
} from "@/lib/infoboard/kiosk-shell-sizing";
import type { WeatherResult } from "@/lib/weather/weather-types";

export type KioskShellHeaderProps = {
  clubLogoSrc?: string | null;
  clubName: string;
  facilityLine?: string | null;
  subtitle?: string | null;
  subtitleEnabled?: boolean;
  initialTimeIso?: string | null;
  timezone: string;
  showTime?: boolean;
  showDate?: boolean;
  staticDateFallback?: string | null;
  /** Keep the simulated Preview Studio moment fixed. Defaults to live kiosk time. */
  liveClock?: boolean;

  /**
   * Canonical weather input for every Infoboard.
   * Unavailable weather renders no placeholder.
   */
  weather?: WeatherResult | null;

  /**
   * Keep weather refreshed on long-running kiosk sessions.
   * Preview hosts should pass false to keep simulated weather fixed.
   */
  liveWeather?: boolean;

  /**
   * Backward-compatible weather/right presentation slot.
   *
   * IMPORTANT:
   * This is rendered in the WEATHER zone, never the Alexa safe zone.
   * New callers should prefer the `weather` prop.
   */
  rightContent?: ReactNode;

  /** Venue display shell palette — defaults to dark stadium header. */
  shellTheme?: "dark" | "light";

  /** Full-width subtitle band (legacy) vs compact inline welcome in the header row. */
  subtitlePlacement?: "band" | "header-inline";
};

const HEADER_THEME = {
  dark: {
    headerBg: "#0A1828",
    subtitleBorder: "1px solid rgba(99, 135, 175, 0.16)",
    mutedText: "#6E87A0",
    clubName: "#ffffff",
    facilityLine: "rgba(255,255,255,0.45)",
    zoneBorder: "1px solid rgba(148, 163, 184, 0.28)",
    dateFallback: "rgba(255,255,255,0.55)",
    accentBorder: "#e87722",
    inlineWelcome: "rgba(255,255,255,0.72)",
  },
  light: {
    headerBg: "#FFFFFF",
    subtitleBorder: "1px solid rgba(11, 31, 58, 0.08)",
    mutedText: "#4A6078",
    clubName: "#0B1F3A",
    facilityLine: "#4A6078",
    zoneBorder: "1px solid rgba(11, 31, 58, 0.12)",
    dateFallback: "#4A6078",
    accentBorder: "#1E5BC6",
    inlineWelcome: "#0B1F3A",
  },
} as const;

const HEADER_ZONE_HEIGHT = "72%";
const HEADER_ZONE_PADDING_X =
  KIOSK_SHELL_CSS_VARS["--kiosk-shell-header-zone-padding-x"];
const HEADER_WEATHER_MIN_WIDTH_PX = KIOSK_SHELL_WEATHER_ZONE_MIN_WIDTH_PX;
const HEADER_WEATHER_MAX_WIDTH_PX = KIOSK_SHELL_WEATHER_ZONE_MAX_WIDTH_PX;
const HEADER_ALEXA_SAFE_ZONE_WIDTH_PX = KIOSK_SHELL_ALEXA_SAFE_ZONE_WIDTH_PX;

function renderCanonicalWeather(
  weather: WeatherResult,
  liveWeather: boolean,
  shellTheme: "dark" | "light",
): ReactElement | null {
  if (weather.isAvailable !== true) {
    return null;
  }

  if (liveWeather) {
    return (
      <LiveKioskShellWeather
        initialWeather={weather}
        live={true}
        shellTheme={shellTheme}
      />
    );
  }

  return (
    <KioskShellWeatherDisplay weather={weather} shellTheme={shellTheme} />
  );
}

export function KioskShellHeader({
  clubLogoSrc,
  clubName,
  facilityLine,
  subtitle,
  subtitleEnabled = true,
  initialTimeIso,
  timezone,
  showTime = true,
  showDate = true,
  staticDateFallback,
  liveClock = true,
  weather,
  liveWeather = true,
  rightContent,
  shellTheme = "dark",
  subtitlePlacement = "band",
}: KioskShellHeaderProps): ReactElement {
  const palette = HEADER_THEME[shellTheme];
  const showSubtitle =
    subtitleEnabled === true &&
    subtitle != null &&
    subtitle.length > 0;
  const showSubtitleBand = showSubtitle && subtitlePlacement === "band";
  const showInlineWelcome = showSubtitle && subtitlePlacement === "header-inline";

  const weatherContent =
    weather != null
      ? renderCanonicalWeather(weather, liveWeather, shellTheme)
      : rightContent ?? null;

  return (
    <div
      data-testid="kiosk-shell-header"
      data-kiosk-shell-contract="true"
      style={{ flexShrink: 0, ...KIOSK_SHELL_CSS_VARS }}
    >
      <header
        data-testid="kiosk-shell-header-bar"
        data-shell-theme={shellTheme}
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          boxSizing: "border-box",

          paddingLeft: KIOSK_SHELL_CSS_VARS["--kiosk-shell-padding-x"],
          paddingRight: 0,
          background: palette.headerBg,
          borderBottom: `${KIOSK_SHELL_CSS_VARS["--kiosk-shell-header-border"]} solid ${palette.accentBorder}`,

          height: KIOSK_SHELL_CSS_VARS["--kiosk-shell-header-height"],
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* CLUB */}
        <div
          data-testid="kiosk-header-left"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flex: showInlineWelcome ? "0 1 28%" : "1 1 0",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {clubLogoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clubLogoSrc}
              alt={`${clubName} Wappen`}
              style={{
                height: KIOSK_SHELL_CSS_VARS["--kiosk-shell-crest-height"],
                width: "auto",
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                height: KIOSK_SHELL_CSS_VARS["--kiosk-shell-crest-height"],
                width: KIOSK_SHELL_CSS_VARS["--kiosk-shell-crest-height"],
                borderRadius: "50%",
                background: "rgba(255,255,255,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                fontWeight: 800,
                color: "rgba(255,255,255,0.55)",
                flexShrink: 0,
              }}
            >
              {clubName.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              minWidth: 0,
            }}
          >
            <span
              data-testid="kiosk-header-club-name"
              style={{
                fontSize: KIOSK_SHELL_CSS_VARS["--kiosk-shell-club-name-font"],
                fontWeight: 800,
                letterSpacing: "0.06em",
                color: palette.clubName,
                lineHeight: 1,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {clubName}
            </span>

            {facilityLine && (
              <span
                style={{
                  fontSize: "14px",
                  letterSpacing: "0.18em",
                  color: palette.facilityLine,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {facilityLine}
              </span>
            )}
          </div>
        </div>

        {showInlineWelcome && (
          <div
            data-testid="kiosk-header-welcome"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: shellTheme === "light" ? "1 1 26%" : "1 1 0",
              minWidth: shellTheme === "light" ? "160px" : 0,
              padding: `0 ${HEADER_ZONE_PADDING_X}`,
              overflow: "visible",
            }}
          >
            <span
              data-testid="board-title-text"
              style={{
                fontSize:
                  shellTheme === "light"
                    ? KIOSK_SHELL_CSS_VARS["--kiosk-shell-light-inline-welcome-font"]
                    : KIOSK_SHELL_CSS_VARS["--kiosk-shell-subtitle-font"],
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "none",
                color: palette.inlineWelcome,
                whiteSpace: shellTheme === "light" ? "normal" : "nowrap",
                overflow: "visible",
                textOverflow: "clip",
                textAlign: "center",
                lineHeight: 1.15,
                maxWidth: "100%",
              }}
            >
              {subtitle}
            </span>
          </div>
        )}

        {/*
         * CLOCK / DATE / WEATHER / ALEXA — fixed flex cluster on the right.
         * Keeps the weather column reserved inside the 1920×1080 shell when
         * the calibrated clock/date blocks use fixed px typography.
         */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flex: "0 0 auto",
            minWidth: 0,
            maxWidth: "100%",
            height: "100%",
          }}
        >
          <div
            data-testid="header-center"
            style={{
              display: "flex",
              alignItems: "center",
              flex: "0 0 auto",
              height: "100%",
            }}
          >
            {/* TIME */}
            <div
              data-testid="header-time-zone"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: HEADER_ZONE_HEIGHT,
                flexShrink: 0,
                paddingLeft: HEADER_ZONE_PADDING_X,
                paddingRight: HEADER_ZONE_PADDING_X,
                borderLeft: palette.zoneBorder,
              }}
            >
              {initialTimeIso != null && showTime ? (
                <LiveClockScreen1
                  initialTimeIso={initialTimeIso}
                  timezone={timezone}
                  showTime={true}
                  showDate={false}
                  mode="time"
                  live={liveClock}
                  shellTheme={shellTheme}
                />
              ) : null}
            </div>

            {/* DATE */}
            <div
              data-testid="header-date-zone"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: HEADER_ZONE_HEIGHT,
                flexShrink: 0,
                paddingLeft: HEADER_ZONE_PADDING_X,
                paddingRight: HEADER_ZONE_PADDING_X,
                borderLeft: palette.zoneBorder,
              }}
            >
              {initialTimeIso != null && showDate ? (
                <LiveClockScreen1
                  initialTimeIso={initialTimeIso}
                  timezone={timezone}
                  showTime={false}
                  showDate={true}
                  mode="date"
                  live={liveClock}
                  shellTheme={shellTheme}
                />
              ) : staticDateFallback != null && showDate ? (
                <span
                  style={{
                    fontSize: KIOSK_SHELL_CSS_VARS["--kiosk-shell-date-font"],
                    letterSpacing: "0.06em",
                    color: palette.dateFallback,
                    whiteSpace: "nowrap",
                  }}
                >
                  {staticDateFallback}
                </span>
              ) : null}
            </div>
          </div>

          {/* WEATHER — never overlaps Alexa */}
          <div
            data-testid="weather-zone"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              flex: `1 0 ${HEADER_WEATHER_MIN_WIDTH_PX}px`,
              minWidth: `${HEADER_WEATHER_MIN_WIDTH_PX}px`,
              maxWidth: `${HEADER_WEATHER_MAX_WIDTH_PX}px`,
              height: HEADER_ZONE_HEIGHT,
              paddingLeft: HEADER_ZONE_PADDING_X,
              paddingRight: HEADER_ZONE_PADDING_X,
              borderLeft: palette.zoneBorder,
              overflow: "hidden",
            }}
          >
            {weatherContent}
          </div>

          {/* ALEXA / FULLY KIOSK — permanently empty ~10% safe zone */}
          <div
            data-testid="alexa-safe-zone"
            aria-hidden="true"
            style={{
              width: `${HEADER_ALEXA_SAFE_ZONE_WIDTH_PX}px`,
              minWidth: `${HEADER_ALEXA_SAFE_ZONE_WIDTH_PX}px`,
              height: "100%",
              flexShrink: 0,
              pointerEvents: "none",
            }}
          />
        </div>
      </header>

      {showSubtitleBand && (
        <div
          data-testid="board-title"
          style={{
            display: "flex",
            alignItems: "center",
            height: KIOSK_SHELL_CSS_VARS["--kiosk-shell-subtitle-height"],
            padding: `0 ${KIOSK_SHELL_CSS_VARS["--kiosk-shell-padding-x"]}`,
            borderBottom: palette.subtitleBorder,
            background: palette.headerBg,
            flexShrink: 0,
          }}
        >
          <span
            data-testid="board-title-text"
            style={{
              fontSize: KIOSK_SHELL_CSS_VARS["--kiosk-shell-subtitle-font"],
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: palette.mutedText,
            }}
          >
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
}