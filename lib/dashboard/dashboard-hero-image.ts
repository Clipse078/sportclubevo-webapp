/**
 * SCE-DASHBOARD-V3-03 — Personal dashboard hero image persistence adapter.
 *
 * User-scoped hero image URL (Vercel Blob) and normalized transform fields.
 */

import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_HERO_TRANSFORM,
  clampPosition,
  type HeroImageTransform,
} from "@/lib/dashboard/dashboard-hero-position";

export const DASHBOARD_HERO_SCHEMA_FIELD = "dashboardHeroImageUrl" as const;
export const DASHBOARD_HERO_ZOOM_FIELD = "dashboardHeroImageZoom" as const;
export const DASHBOARD_HERO_POSITION_X_FIELD = "dashboardHeroImagePositionX" as const;
export const DASHBOARD_HERO_POSITION_Y_FIELD = "dashboardHeroImagePositionY" as const;

const HERO_USER_SELECT = {
  dashboardHeroImageUrl: true,
  dashboardHeroImageZoom: true,
  dashboardHeroImagePositionX: true,
  dashboardHeroImagePositionY: true,
} as const;

export type DashboardHeroState = {
  imageUrl: string | null;
  zoom: number;
  positionX: number;
  positionY: number;
};

export type DashboardHeroTransform = HeroImageTransform;

export function getDashboardHeroStorageKey(userId: string, ext: string): string {
  return `dashboard-hero/${userId}.${ext}`;
}

function resolveTransformFromDb(
  row: {
    dashboardHeroImageZoom: number | null;
    dashboardHeroImagePositionX: number | null;
    dashboardHeroImagePositionY: number | null;
  } | null,
): HeroImageTransform {
  if (!row) {
    return { ...DEFAULT_HERO_TRANSFORM };
  }

  const zoom = row.dashboardHeroImageZoom;
  const positionX = row.dashboardHeroImagePositionX;
  const positionY = row.dashboardHeroImagePositionY;

  const hasAnyTransform =
    zoom !== null || positionX !== null || positionY !== null;

  if (!hasAnyTransform) {
    return { ...DEFAULT_HERO_TRANSFORM };
  }

  return clampPosition({
    zoom: typeof zoom === "number" && Number.isFinite(zoom) ? zoom : DEFAULT_HERO_TRANSFORM.zoom,
    positionX:
      typeof positionX === "number" && Number.isFinite(positionX)
        ? positionX
        : DEFAULT_HERO_TRANSFORM.positionX,
    positionY:
      typeof positionY === "number" && Number.isFinite(positionY)
        ? positionY
        : DEFAULT_HERO_TRANSFORM.positionY,
  });
}

function toDashboardHeroState(
  row: {
    dashboardHeroImageUrl: string | null;
    dashboardHeroImageZoom: number | null;
    dashboardHeroImagePositionX: number | null;
    dashboardHeroImagePositionY: number | null;
  } | null,
): DashboardHeroState {
  const transform = resolveTransformFromDb(row);
  return {
    imageUrl: row?.dashboardHeroImageUrl ?? null,
    zoom: transform.zoom,
    positionX: transform.positionX,
    positionY: transform.positionY,
  };
}

export async function getUserDashboardHeroState(userId: string): Promise<DashboardHeroState> {
  if (!userId) {
    return toDashboardHeroState(null);
  }

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: HERO_USER_SELECT,
  });

  return toDashboardHeroState(row);
}

/** @deprecated Prefer getUserDashboardHeroState for full hero state. */
export async function getUserDashboardHeroImageUrl(userId: string): Promise<string | null> {
  const state = await getUserDashboardHeroState(userId);
  return state.imageUrl;
}

export type PersistDashboardHeroResult =
  | { ok: true; persisted: true; state: DashboardHeroState }
  | { ok: false; error: string };

export async function updateUserDashboardHeroImage(
  userId: string,
  imageUrl: string,
): Promise<PersistDashboardHeroResult> {
  if (!userId) {
    return { ok: false, error: "Benutzer nicht gefunden." };
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: HERO_USER_SELECT,
    });

    if (!existing) {
      return { ok: false, error: "Benutzer nicht gefunden." };
    }

    const row = await prisma.user.update({
      where: { id: userId },
      data: {
        dashboardHeroImageUrl: imageUrl,
      },
      select: HERO_USER_SELECT,
    });

    return { ok: true, persisted: true, state: toDashboardHeroState(row) };
  } catch {
    return { ok: false, error: "Titelbild konnte nicht gespeichert werden." };
  }
}

export async function updateUserDashboardHeroTransform(
  userId: string,
  transform: HeroImageTransform,
): Promise<PersistDashboardHeroResult> {
  if (!userId) {
    return { ok: false, error: "Benutzer nicht gefunden." };
  }

  const normalized = clampPosition(transform);

  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existing) {
      return { ok: false, error: "Benutzer nicht gefunden." };
    }

    const row = await prisma.user.update({
      where: { id: userId },
      data: {
        dashboardHeroImageZoom: normalized.zoom,
        dashboardHeroImagePositionX: normalized.positionX,
        dashboardHeroImagePositionY: normalized.positionY,
      },
      select: HERO_USER_SELECT,
    });

    return { ok: true, persisted: true, state: toDashboardHeroState(row) };
  } catch {
    return { ok: false, error: "Titelbild-Position konnte nicht gespeichert werden." };
  }
}

export async function clearUserDashboardHero(userId: string): Promise<PersistDashboardHeroResult> {
  if (!userId) {
    return { ok: false, error: "Benutzer nicht gefunden." };
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existing) {
      return { ok: false, error: "Benutzer nicht gefunden." };
    }

    const row = await prisma.user.update({
      where: { id: userId },
      data: {
        dashboardHeroImageUrl: null,
        dashboardHeroImageZoom: null,
        dashboardHeroImagePositionX: null,
        dashboardHeroImagePositionY: null,
      },
      select: HERO_USER_SELECT,
    });

    return { ok: true, persisted: true, state: toDashboardHeroState(row) };
  } catch {
    return { ok: false, error: "Titelbild konnte nicht entfernt werden." };
  }
}

/** @deprecated Prefer updateUserDashboardHeroImage / clearUserDashboardHero. */
export async function persistUserDashboardHeroImageUrl(
  userId: string,
  imageUrl: string | null,
): Promise<PersistDashboardHeroResult> {
  if (imageUrl === null) {
    return clearUserDashboardHero(userId);
  }
  return updateUserDashboardHeroImage(userId, imageUrl);
}
