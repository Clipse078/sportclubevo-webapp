/**
 * SCE-NAV-IA-V2-01 — filesystem scan of authenticated App Router pages (audit-only).
 */

import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ADMIN_APP_ROOT = join(process.cwd(), "app/(admin)");

function isDynamicSegment(segment: string): boolean {
  return segment.startsWith("[") && segment.endsWith("]");
}

function segmentToRoutePart(segment: string): string | null {
  if (isDynamicSegment(segment)) {
    return null;
  }
  return segment;
}

function walkPages(dir: string, routePrefix: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      const part = segmentToRoutePart(entry);
      const nextPrefix = part ? `${routePrefix}/${part}` : routePrefix;
      walkPages(full, nextPrefix, out);
      continue;
    }

    if (entry === "page.tsx" || entry === "page.ts") {
      out.push(routePrefix || "/");
    }
  }
}

/** Static authenticated page routes under app/(admin) (dynamic segments omitted). */
export function scanAuthenticatedStaticRoutes(): string[] {
  const routes: string[] = [];
  walkPages(ADMIN_APP_ROOT, "", routes);
  return [...new Set(routes)].sort((a, b) => a.localeCompare(b));
}

/** Routes that are authenticated but intentionally excluded from canonical nav registry. */
export const AUTHENTICATED_ROUTE_EXCLUSION_PREFIXES = [
  "/dashboard/account",
  "/dashboard/dev",
  "/tenant/",
  "/admin",
  /** Legacy Vereinsleitung hub surfaces not promoted to canonical nav leaves. */
  "/vereinsleitung/kpis",
  "/vereinsleitung/templates",
] as const;

/** Exact routes that are authenticated but not canonical nav registry leaves. */
export const AUTHENTICATED_ROUTE_EXCLUSION_EXACT = ["/vereinsleitung"] as const;

export function isExcludedAuthenticatedRoute(route: string): boolean {
  if (AUTHENTICATED_ROUTE_EXCLUSION_EXACT.includes(route as (typeof AUTHENTICATED_ROUTE_EXCLUSION_EXACT)[number])) {
    return true;
  }
  if (AUTHENTICATED_ROUTE_EXCLUSION_PREFIXES.some((p) => route.startsWith(p))) {
    return true;
  }
  return false;
}

export function summarizeUnregisteredRoutes(
  staticRoutes: readonly string[],
  registeredHrefs: readonly string[],
): string[] {
  const registered = new Set(registeredHrefs);
  const unregistered: string[] = [];

  for (const route of staticRoutes) {
    if (isExcludedAuthenticatedRoute(route)) continue;
    const covered = [...registered].some(
      (href) => route === href || route.startsWith(`${href}/`),
    );
    if (!covered) {
      unregistered.push(route);
    }
  }

  return unregistered.sort((a, b) => a.localeCompare(b));
}

export function relativeAdminPath(route: string): string {
  return relative(process.cwd(), join(ADMIN_APP_ROOT, route.replace(/^\//, "")));
}
