import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  INFOBOARD_WRITE_PERMISSIONS,
  NEWS_WRITE_PERMISSIONS,
  WEBSITE_WRITE_PERMISSIONS,
} from "@/lib/permissions/content-view-permissions";

type PermissionSession = Parameters<typeof hasPermission>[0];

export function sessionCanWriteNews(session: PermissionSession): boolean {
  return NEWS_WRITE_PERMISSIONS.some((key) => hasPermission(session, key));
}

export function sessionCanWriteWebsite(session: PermissionSession): boolean {
  return WEBSITE_WRITE_PERMISSIONS.some((key) => hasPermission(session, key));
}

export function sessionCanWriteInfoboard(session: PermissionSession): boolean {
  return INFOBOARD_WRITE_PERMISSIONS.some((key) => hasPermission(session, key));
}

export function sessionCanReadNews(session: PermissionSession): boolean {
  return hasPermission(session, PERMISSIONS.NEWS_VIEW) || sessionCanWriteNews(session);
}
