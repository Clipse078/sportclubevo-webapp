import type { AppNavigationDomainId } from "@/lib/nav/app-navigation-domains";

export type PrimaryL1VisualState = "strong" | "route-subtle" | "neutral";

/**
 * Canonical L1 chrome: at most one "strong" selection (open panel or route-active when closed).
 * Route-active while another domain's panel is open uses a restrained secondary treatment only.
 */
export function resolvePrimaryL1VisualState(
  domainId: AppNavigationDomainId,
  routeActiveDomainId: AppNavigationDomainId | null,
  openPanelDomainId: AppNavigationDomainId | null,
  routeActiveDisabled: boolean,
): PrimaryL1VisualState {
  const isRouteActive =
    !routeActiveDisabled && routeActiveDomainId != null && routeActiveDomainId === domainId;
  const isOpen = openPanelDomainId === domainId;

  if (isOpen) return "strong";
  if (openPanelDomainId) {
    return isRouteActive ? "route-subtle" : "neutral";
  }
  return isRouteActive ? "strong" : "neutral";
}

export function primaryL1VisualStateClass(state: PrimaryL1VisualState): string | undefined {
  if (state === "strong") return "sce-global-primary-nav-item--active";
  if (state === "route-subtle") return "sce-global-primary-nav-item--route-context";
  return undefined;
}
