/**
 * Pathnames that belong to Vereinsentwicklung workspaces but sit outside the list href.
 */

import {
  CD_CONNECTED_NAV_KEYS,
  parseConnectedViewFromLocation,
  type CdConnectedView,
} from "./vereinsentwicklung-connected-workspace";
import { CD_WORKSPACE_ANSICHT_QUERY } from "./vereinsentwicklung-workspace-routing";

export type VereinsentwicklungNavPathAlias = {
  pathPrefix: string;
  /** Nav child href that should stay active for paths under pathPrefix. */
  activeForHref: string;
};

export const SCE_VEREINSENTWICKLUNG_NAV_PATH_ALIASES: readonly VereinsentwicklungNavPathAlias[] = [
  {
    pathPrefix: "/vereinsleitung/sprints",
    activeForHref: "/vereinsleitung/vorhaben-und-umsetzung?ansicht=umsetzungsphasen",
  },
  {
    pathPrefix: "/vereinsleitung/initiativen",
    activeForHref: "/vereinsleitung/vorhaben-und-umsetzung?ansicht=aufgaben",
  },
] as const;

function splitHref(href: string): { pathname: string; search: URLSearchParams } {
  const qIndex = href.indexOf("?");
  if (qIndex === -1) return { pathname: href, search: new URLSearchParams() };
  return {
    pathname: href.slice(0, qIndex),
    search: new URLSearchParams(href.slice(qIndex + 1)),
  };
}

function hrefQueryMatches(href: URLSearchParams, location: URLSearchParams): boolean {
  let required = 0;
  for (const [key, value] of href.entries()) {
    required += 1;
    if (location.get(key) !== value) return false;
  }
  return required === 0 || required > 0;
}

export function pathnameMatchesVereinsentwicklungNavHref(
  pathname: string,
  href: string,
  locationSearch?: URLSearchParams | string | null,
): boolean {
  const location =
    locationSearch instanceof URLSearchParams
      ? locationSearch
      : new URLSearchParams(locationSearch ?? "");
  const target = splitHref(href);

  if (pathname === target.pathname) {
    if ([...target.search.keys()].length === 0) return true;
    return hrefQueryMatches(target.search, location);
  }

  if (href === "/dashboard") return false;
  if (pathname.startsWith(`${target.pathname}/`)) {
    if ([...target.search.keys()].length === 0) return true;
    return hrefQueryMatches(target.search, location);
  }

  return SCE_VEREINSENTWICKLUNG_NAV_PATH_ALIASES.some((alias) => {
    if (alias.activeForHref !== href) return false;
    return pathname.startsWith(`${alias.pathPrefix}/`);
  });
}

export function resolveVereinsentwicklungConnectedNavChildKey(
  pathname: string,
  searchParams: URLSearchParams | Record<string, string | undefined | null>,
): string | null {
  const view = parseConnectedViewFromLocation(pathname, searchParams);
  if (!view) return null;
  return CD_CONNECTED_NAV_KEYS[view];
}

export function connectedViewForNavChildKey(navChildKey: string): CdConnectedView | null {
  const entry = Object.entries(CD_CONNECTED_NAV_KEYS).find(([, key]) => key === navChildKey);
  return (entry?.[0] as CdConnectedView | undefined) ?? null;
}

export { CD_WORKSPACE_ANSICHT_QUERY };