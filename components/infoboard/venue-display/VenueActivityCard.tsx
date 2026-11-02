/**
 * components/infoboard/venue-display/VenueActivityCard.tsx
 *
 * Shared four-column shell for Infoboard venue activity cards.
 * TIME | ACTIVITY | KABINE | PLATZ — geometry is invariant across activity types.
 */

import type { CSSProperties, ReactElement, ReactNode } from "react";
import {
  VENUE_ACTIVITY_CARD_TEST_ID,
  VENUE_ACTIVITY_COLUMN_ATTR,
  VENUE_ACTIVITY_COLUMN_MARKERS,
  VENUE_ACTIVITY_COLUMN_TEST_IDS,
  VENUE_ACTIVITY_GRID_DATA_ATTR,
} from "@/lib/infoboard/venue-display-grid";

export type VenueActivityCardProps = {
  /** Decorative ambient raster spanning ACTIVITY + KABINE + PLATZ (absolute, out of flow). */
  readonly operationalAmbient?: ReactNode;
  readonly time: ReactNode;
  readonly identity: ReactNode;
  /**
   * Kabine column, or a fragment containing Kabine + Platz destination blocks
   * (legacy Screen 1 destination helpers return paired fragments).
   */
  readonly kabine: ReactNode;
  readonly platz?: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly "data-testid"?: string;
  readonly [key: `data-${string}`]: string | number | undefined;
};

export function VenueActivityTime({
  className,
  children,
  testId = VENUE_ACTIVITY_COLUMN_TEST_IDS.time,
  ...rest
}: {
  readonly className?: string;
  readonly children: ReactNode;
  readonly testId?: string;
  readonly [key: `data-${string}`]: string | undefined;
}): ReactElement {
  return (
    <div
      {...rest}
      className={className}
      {...{ [VENUE_ACTIVITY_COLUMN_ATTR]: VENUE_ACTIVITY_COLUMN_MARKERS.time }}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export function VenueActivityIdentity({
  className,
  children,
  ...rest
}: {
  readonly className?: string;
  readonly children: ReactNode;
  readonly [key: `data-${string}`]: string | undefined;
}): ReactElement {
  return (
    <div
      {...rest}
      className={className}
      {...{ [VENUE_ACTIVITY_COLUMN_ATTR]: VENUE_ACTIVITY_COLUMN_MARKERS.identity }}
      data-testid={VENUE_ACTIVITY_COLUMN_TEST_IDS.identity}
    >
      {children}
    </div>
  );
}

export function VenueActivityKabine({
  className,
  children,
  testId = VENUE_ACTIVITY_COLUMN_TEST_IDS.kabine,
  ...rest
}: {
  readonly className?: string;
  readonly children: ReactNode;
  readonly testId?: string;
  readonly [key: `data-${string}`]: string | undefined;
}): ReactElement {
  return (
    <div
      {...rest}
      className={className}
      {...{ [VENUE_ACTIVITY_COLUMN_ATTR]: VENUE_ACTIVITY_COLUMN_MARKERS.kabine }}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export function VenueActivityPlatz({
  className,
  children,
  testId = VENUE_ACTIVITY_COLUMN_TEST_IDS.platz,
  ...rest
}: {
  readonly className?: string;
  readonly children: ReactNode;
  readonly testId?: string;
  readonly [key: `data-${string}`]: string | undefined;
}): ReactElement {
  return (
    <div
      {...rest}
      className={className}
      {...{ [VENUE_ACTIVITY_COLUMN_ATTR]: VENUE_ACTIVITY_COLUMN_MARKERS.platz }}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export function VenueActivityCard({
  operationalAmbient,
  time,
  identity,
  kabine,
  platz,
  className,
  style,
  "data-testid": dataTestId = "event-row",
  ...dataAttrs
}: VenueActivityCardProps): ReactElement {
  return (
    <li
      className={className}
      style={style}
      data-testid={dataTestId}
      {...{ [VENUE_ACTIVITY_GRID_DATA_ATTR]: "true" }}
      data-venue-activity-card={VENUE_ACTIVITY_CARD_TEST_ID}
      data-venue-operational-ambient={operationalAmbient != null ? "true" : undefined}
      {...dataAttrs}
    >
      {operationalAmbient ?? null}
      {time}
      {identity}
      {kabine}
      {platz ?? null}
    </li>
  );
}
