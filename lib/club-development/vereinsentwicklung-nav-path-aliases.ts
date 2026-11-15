/**
 * Pathnames that belong to Vereinsentwicklung workspaces but sit outside the list href.
 */

export type VereinsentwicklungNavPathAlias = {
  pathPrefix: string;
  /** Nav child href that should stay active for paths under pathPrefix. */
  activeForHref: string;
};

export const SCE_VEREINSENTWICKLUNG_NAV_PATH_ALIASES: readonly VereinsentwicklungNavPathAlias[] = [
  {
    pathPrefix: "/vereinsleitung/sprints",
    activeForHref: "/vereinsleitung/vorhaben-und-umsetzung",
  },
  {
    pathPrefix: "/vereinsleitung/initiativen",
    activeForHref: "/vereinsleitung/vorhaben-und-umsetzung",
  },
] as const;

export function pathnameMatchesVereinsentwicklungNavHref(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  if (pathname.startsWith(`${href}/`)) return true;
  return SCE_VEREINSENTWICKLUNG_NAV_PATH_ALIASES.some(
    (alias) => alias.activeForHref === href && pathname.startsWith(`${alias.pathPrefix}/`),
  );
}