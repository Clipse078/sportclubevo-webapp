"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PermissionKey } from "@/lib/permissions/permissions";
import type { NavCapabilityContext } from "@/lib/nav/nav-config";
import {
  buildAppNavigationModelForUser,
  buildNavigationHref,
} from "@/lib/nav/app-navigation-model";
import type { WorkspaceContext } from "@/lib/workspace/workspace-context";

const MAX_IDLE_PREFETCH_ROUTES = 6;

type UsePermissionAwareRoutePrefetchArgs = {
  permissionKeys: PermissionKey[];
  workspaceContext: WorkspaceContext;
  navCapabilities?: NavCapabilityContext;
};

/**
 * Prefetches likely L1 module destinations after idle time.
 * Only routes visible in the permission-filtered navigation model are prefetched.
 */
export function usePermissionAwareRoutePrefetch({
  permissionKeys,
  workspaceContext,
  navCapabilities,
}: UsePermissionAwareRoutePrefetchArgs): void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedSeason = searchParams.get("season");

  const prefetchHrefs = useMemo(() => {
    const model = buildAppNavigationModelForUser(
      permissionKeys,
      workspaceContext,
      navCapabilities,
    );
    const hrefs = model.domains.map((domain) =>
      buildNavigationHref(domain.defaultDestination.href, selectedSeason),
    );
    const unique = [...new Set(hrefs)];
    return unique.filter((href) => {
      try {
        const path = new URL(href, "http://local").pathname;
        return path !== pathname;
      } catch {
        return href !== pathname;
      }
    });
  }, [permissionKeys, workspaceContext, navCapabilities, selectedSeason, pathname]);

  useEffect(() => {
    if (prefetchHrefs.length === 0) return;

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      for (const href of prefetchHrefs.slice(0, MAX_IDLE_PREFETCH_ROUTES)) {
        router.prefetch(href);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const timer = setTimeout(run, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [prefetchHrefs, router]);
}
