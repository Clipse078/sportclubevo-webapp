import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

export const NEWS_READ_PERMISSIONS = [
  PERMISSIONS.NEWS_VIEW,
  PERMISSIONS.NEWS_MANAGE,
  PERMISSIONS.WEBSITE_MANAGE,
] as const satisfies readonly PermissionKey[];

export const NEWS_WRITE_PERMISSIONS = [
  PERMISSIONS.NEWS_MANAGE,
  PERMISSIONS.WEBSITE_MANAGE,
] as const satisfies readonly PermissionKey[];

export const WEBSITE_READ_PERMISSIONS = [
  PERMISSIONS.WEBSITE_VIEW,
  PERMISSIONS.WEBSITE_MANAGE,
  PERMISSIONS.NEWS_MANAGE,
] as const satisfies readonly PermissionKey[];

export const WEBSITE_WRITE_PERMISSIONS = [PERMISSIONS.WEBSITE_MANAGE] as const satisfies readonly PermissionKey[];

export const INFOBOARD_READ_PERMISSIONS = [
  PERMISSIONS.INFOBOARD_VIEW,
  PERMISSIONS.INFOBOARD_MANAGE,
  PERMISSIONS.EVENTS_PUBLISH_INFOBOARD,
] as const satisfies readonly PermissionKey[];

export const INFOBOARD_WRITE_PERMISSIONS = [
  PERMISSIONS.INFOBOARD_MANAGE,
  PERMISSIONS.EVENTS_PUBLISH_INFOBOARD,
] as const satisfies readonly PermissionKey[];

export const PUBLISHING_READ_PERMISSIONS = [
  PERMISSIONS.NEWS_VIEW,
  PERMISSIONS.WEBSITE_VIEW,
  PERMISSIONS.NEWS_MANAGE,
  PERMISSIONS.WEBSITE_MANAGE,
] as const satisfies readonly PermissionKey[];
