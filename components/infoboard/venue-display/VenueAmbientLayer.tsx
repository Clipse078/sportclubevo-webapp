/**
 * Decorative ambient raster layer — never participates in layout.
 */

import type { ReactElement } from "react";
import type { InfoboardActivityAmbientKind } from "@/lib/infoboard/screen1-ambient-assets";
import styles from "./VenueAmbientLayer.module.css";

export type VenueActivityAmbientLayerProps = {
  readonly src: string;
  readonly kind: InfoboardActivityAmbientKind;
  /** @deprecated R13 — ambient always mounts on the unified operational environment. */
  readonly placement?: "operational-environment" | "identity-column" | "training-matrix-activity";
  readonly testId?: string;
};

const KIND_CLASS: Record<InfoboardActivityAmbientKind, string> = {
  MATCH: styles.activityMatch,
  TOURNAMENT: styles.activityTournament,
  TRAINING: styles.activityTraining,
};

export function VenueActivityAmbientLayer({
  src,
  kind,
  placement = "operational-environment",
  testId = "venue-activity-ambient",
}: VenueActivityAmbientLayerProps): ReactElement {
  const placementClass =
    placement === "training-matrix-activity" ? styles.trainingMatrixActivity : "";

  return (
    <div
      className={`${styles.ambientLayer} ${KIND_CLASS[kind]} ${placementClass}`}
      data-testid={testId}
      data-venue-ambient-layer="activity"
      data-venue-ambient-scope="operational-environment"
      data-venue-ambient-kind={kind}
      aria-hidden="true"
    >
      <div
        className={styles.baseActivityAtmosphere}
        data-venue-ambient-base-atmosphere="true"
        aria-hidden="true"
      />
      <div
        className={styles.ambientIllustrationClip}
        data-venue-ambient-illustration-clip="true"
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.ambientImage}
          src={src}
          alt=""
          aria-hidden="true"
          draggable={false}
          data-venue-ambient-raster="true"
        />
      </div>
      <div className={styles.ambientScrim} aria-hidden="true" />
    </div>
  );
}

export type VenueHeaderAmbientLayerProps = {
  readonly src: string;
  readonly testId?: string;
};

export function VenueHeaderAmbientLayer({
  src,
  testId = "venue-header-ambient",
}: VenueHeaderAmbientLayerProps): ReactElement {
  return (
    <div
      className={`${styles.ambientLayer} ${styles.headerAmbientLayer}`}
      data-testid={testId}
      data-venue-ambient-layer="header"
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.ambientImage}
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        data-venue-ambient-raster="true"
      />
      <div className={styles.ambientScrim} aria-hidden="true" />
    </div>
  );
}

export type VenueJumbotronAmbientLayerProps = {
  readonly src: string;
  readonly testId?: string;
};

export function VenueJumbotronAmbientLayer({
  src,
  testId = "venue-jumbotron-ambient",
}: VenueJumbotronAmbientLayerProps): ReactElement {
  return (
    <div
      className={`${styles.ambientLayer} ${styles.jumbotronAmbientLayer}`}
      data-testid={testId}
      data-venue-ambient-layer="jumbotron"
      data-venue-ambient-surface="dark"
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.ambientImage}
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        data-venue-ambient-raster="true"
      />
      <div className={styles.ambientScrim} aria-hidden="true" />
    </div>
  );
}

export function VenueHeaderTenantAccent(): ReactElement {
  return (
    <div
      className={styles.tenantAccent}
      data-testid="venue-header-tenant-accent"
      aria-hidden="true"
    />
  );
}
