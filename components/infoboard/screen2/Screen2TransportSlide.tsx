/**
 * components/infoboard/screen2/Screen2TransportSlide.tsx
 *
 * SCE-INFOBOARD-R23R2 — full-height premium ÖV departure board for 55-inch signage.
 */

import type { CSSProperties, ReactElement } from "react";
import { ArrowLeft, ArrowRight, BusFront } from "lucide-react";
import { resolveTransportLineColor } from "@/lib/transport/transport-line-colors";
import { resolveTenantTransportConfig } from "@/lib/transport/transport-config";
import type {
  TransportDeparture,
  TransportDirectionGroup,
  TransportResult,
} from "@/lib/transport/transport-types";
import { applyTransportDepartureLifecycle } from "@/lib/transport/transport-presentation";
import { resolveEffectiveDepartureMs } from "@/lib/transport/transport-effective-departure";
import {
  formatRelativeWaitDisplay,
  resolveRelativeWaitDisplay,
  resolveWaitTimeTone,
} from "@/lib/transport/transport-wait-time";
import styles from "./Screen2TransportSlide.module.css";

export type Screen2TransportSlideProps = {
  transport: TransportResult | null | undefined;
  timezone: string;
  nowIso?: string;
  /** When set, re-applies expiry filtering and direction replenishment on each render. */
  lifecycleTenantKey?: string | null;
  /** Compact embedded panel below the Sportanlage map. */
  compact?: boolean;
  /** Venue display theme — full-screen rotation uses LIGHT/DARK parity. */
  theme?: "dark" | "light";
};

function formatMinutesUntil(
  departure: TransportDeparture,
  nowMs: number,
  timezone: string,
): {
  minutesLabel: string;
  waitTimeTone: ReturnType<typeof resolveWaitTimeTone>;
  absoluteTime: string;
  delayLabel: string | null;
} {
  const effectiveMs = resolveEffectiveDepartureMs(departure);
  const waitDisplay = resolveRelativeWaitDisplay(effectiveMs, nowMs);
  const minutesLabel = formatRelativeWaitDisplay(waitDisplay) ?? "";
  const toneMinutes =
    waitDisplay.kind === "minutes" ? waitDisplay.minutesUntil : waitDisplay.kind === "jetzt" ? 0 : -1;
  const waitTimeTone = resolveWaitTimeTone(Math.max(0, toneMinutes));

  const absoluteTime = new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(effectiveMs));

  const delayLabel =
    departure.delayMinutes && departure.delayMinutes > 0
      ? `+${departure.delayMinutes}`
      : null;

  return { minutesLabel, waitTimeTone, absoluteTime, delayLabel };
}

function resolveDepartures(transport: TransportResult | null | undefined): {
  departures: TransportDeparture[];
  directionGroups: TransportDirectionGroup[];
  stationDisplayName: string;
  isStale: boolean;
  hasRealtimeData: boolean;
  unavailable: boolean;
  empty: boolean;
} {
  if (!transport) {
    return {
      departures: [],
      directionGroups: [],
      stationDisplayName: "",
      isStale: false,
      hasRealtimeData: false,
      unavailable: true,
      empty: false,
    };
  }

  if (transport.isAvailable) {
    return {
      departures: transport.departures,
      directionGroups: transport.directionGroups,
      stationDisplayName: transport.stationDisplayName,
      isStale: transport.isStale,
      hasRealtimeData: transport.hasRealtimeData,
      unavailable: false,
      empty: transport.departures.length === 0,
    };
  }

  const cached = transport.cachedDepartures ?? [];
  if (cached.length > 0) {
    return {
      departures: cached,
      directionGroups: [],
      stationDisplayName: transport.stationDisplayName,
      isStale: true,
      hasRealtimeData: cached.some((departure) => departure.hasRealtime),
      unavailable: false,
      empty: false,
    };
  }

  return {
    departures: [],
    directionGroups: [],
    stationDisplayName: transport.stationDisplayName,
    isStale: false,
    hasRealtimeData: false,
    unavailable: true,
    empty: false,
  };
}

function TransportDepartureRow({
  departure,
  nowMs,
  timezone,
  compact,
}: {
  departure: TransportDeparture;
  nowMs: number;
  timezone: string;
  compact: boolean;
}): ReactElement {
  const timing = formatMinutesUntil(departure, nowMs, timezone);
  const lineColor = resolveTransportLineColor(departure.line);
  const minutesClassName = [
    styles.minutes,
    timing.waitTimeTone === "soon"
      ? styles.minutesSoon
      : timing.waitTimeTone === "medium"
        ? styles.minutesMedium
        : styles.minutesLong,
    timing.minutesLabel === "Jetzt" ? styles.minutesImminent : "",
  ]
    .filter(Boolean)
    .join(" ");

  const isImminent = timing.waitTimeTone === "soon";

  return (
    <div
      className={styles.row}
      data-testid="screen2-transport-row"
      data-wait-tone={timing.waitTimeTone}
      data-imminent={isImminent ? "true" : "false"}
    >
      <div className={styles.lineColumn}>
        <span
          className={styles.lineBadge}
          data-testid="screen2-transport-line-badge"
          style={{
            backgroundColor: lineColor.background,
            color: lineColor.foreground,
          }}
        >
          {departure.line}
        </span>
      </div>

      <div className={styles.detailColumn}>
        <div className={styles.destination} title={departure.destination}>
          {departure.destination}
        </div>
        <div className={styles.metaRow}>
          <span className={styles.category}>{departure.categoryLabel}</span>
          {departure.platform ? (
            <span className={styles.platform}>Gl. {departure.platform}</span>
          ) : null}
        </div>
      </div>

      <div className={styles.countdownColumn}>
        <span
          className={minutesClassName}
          data-testid="screen2-transport-wait-time"
          data-wait-tone={timing.waitTimeTone}
        >
          {timing.minutesLabel}
        </span>
        <span className={styles.absoluteTime} data-testid="screen2-transport-absolute-time">
          {timing.absoluteTime}
          {timing.delayLabel ? (
            <span className={styles.delayInline} data-testid="screen2-transport-delay">
              {" "}
              {timing.delayLabel}
            </span>
          ) : null}
        </span>
      </div>

      {!compact ? (
        <span className={styles.srOnly}>
          Linie {departure.line} nach {departure.destination}, {timing.minutesLabel}, {timing.absoluteTime}
          {timing.delayLabel ? ` Verspätung ${timing.delayLabel}` : ""}
        </span>
      ) : null}
    </div>
  );
}

function DirectionHeading({ group }: { group: TransportDirectionGroup }): ReactElement {
  const isLeft = group.orientation === "left";
  const Arrow = isLeft ? ArrowLeft : ArrowRight;

  return (
    <h3
      className={styles.directionHeading}
      data-orientation={group.orientation}
      data-testid={`screen2-transport-direction-heading-${group.id}`}
    >
      {isLeft ? (
        <Arrow
          className={styles.directionArrow}
          strokeWidth={2.25}
          aria-hidden
          data-testid="screen2-transport-direction-arrow-left"
        />
      ) : null}
      <span className={styles.directionLabel}>{group.displayName}</span>
      {!isLeft ? (
        <Arrow
          className={styles.directionArrow}
          strokeWidth={2.25}
          aria-hidden
          data-testid="screen2-transport-direction-arrow-right"
        />
      ) : null}
    </h3>
  );
}

function TransportDirectionColumn({
  group,
  nowMs,
  timezone,
  compact,
}: {
  group: TransportDirectionGroup;
  nowMs: number;
  timezone: string;
  compact: boolean;
}): ReactElement {
  const rowCount = group.departures.length;
  const sparseRows = rowCount > 0 && rowCount <= 3;

  return (
    <section
      className={styles.directionColumn}
      data-testid={`screen2-transport-direction-${group.id}`}
      data-orientation={group.orientation}
    >
      <DirectionHeading group={group} />
      {rowCount === 0 ? (
        <div className={styles.directionEmpty} data-testid="screen2-transport-direction-empty">
          Keine nächsten Verbindungen
        </div>
      ) : (
        <div
          className={styles.directionRows}
          data-testid="screen2-transport-direction-rows"
          data-row-count={String(rowCount)}
          data-sparse={sparseRows ? "true" : "false"}
          style={
            {
              "--screen2-transport-direction-row-count": String(rowCount),
            } as CSSProperties
          }
        >
          {group.departures.map((departure, index) => (
            <TransportDepartureRow
              key={`${group.id}-${departure.line}-${departure.destination}-${departure.plannedDeparture}-${index}`}
              departure={departure}
              nowMs={nowMs}
              timezone={timezone}
              compact={compact}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function Screen2TransportSlide({
  transport,
  timezone,
  nowIso,
  lifecycleTenantKey = null,
  compact = false,
  theme = "dark",
}: Screen2TransportSlideProps): ReactElement {
  const nowMs = Date.parse(nowIso ?? new Date().toISOString());
  const shouldApplyLifecycle = nowIso !== undefined || Boolean(lifecycleTenantKey);
  const lifecycleConfig = lifecycleTenantKey
    ? resolveTenantTransportConfig(lifecycleTenantKey)
    : null;
  const lifecycleTransport = shouldApplyLifecycle
    ? applyTransportDepartureLifecycle(transport, new Date(nowMs), lifecycleConfig)
    : transport;
  const resolved = resolveDepartures(lifecycleTransport);
  const hasDirectionGroups = resolved.directionGroups.length > 0;

  return (
    <div
      className={`${styles.slide}${compact ? ` ${styles.compact}` : ""}`}
      data-testid="screen2-transport-slide"
      data-theme={theme}
      data-compact={compact ? "true" : "false"}
      data-stale={resolved.isStale ? "true" : "false"}
    >
      <div className={styles.header}>
        <div className={styles.titleBand}>
          <div className={styles.titleIcon} aria-label="Öffentlicher Verkehr">
            <BusFront
              className={styles.titleIconSvg}
              strokeWidth={2}
              aria-hidden
              data-testid="screen2-transport-bus-icon"
            />
          </div>
          <div className={styles.titleCopy}>
            <div className={styles.eyebrow}>ÖV-ABFAHRTEN</div>
            <div className={styles.station}>{resolved.stationDisplayName || "—"}</div>
          </div>
        </div>
        {!compact && resolved.isStale ? (
          <div className={styles.staleNotice} data-testid="screen2-transport-stale">
            Stand kann veraltet sein
          </div>
        ) : null}
      </div>

      {resolved.unavailable ? (
        <div className={styles.unavailableState} data-testid="screen2-transport-unavailable">
          Abfahrten vorübergehend nicht verfügbar
        </div>
      ) : resolved.empty && !hasDirectionGroups ? (
        <div className={styles.emptyState} data-testid="screen2-transport-empty">
          Keine nächsten Verbindungen verfügbar
        </div>
      ) : hasDirectionGroups ? (
        <div className={styles.directionColumns} data-testid="screen2-transport-direction-columns">
          {resolved.directionGroups.map((group) => (
            <TransportDirectionColumn
              key={group.id}
              group={group}
              nowMs={nowMs}
              timezone={timezone}
              compact={compact}
            />
          ))}
        </div>
      ) : (
        <div className={styles.rows} data-testid="screen2-transport-rows">
          {resolved.departures.map((departure, index) => (
            <TransportDepartureRow
              key={`${departure.line}-${departure.destination}-${departure.plannedDeparture}-${index}`}
              departure={departure}
              nowMs={nowMs}
              timezone={timezone}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
}
