"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useOptionalSceComposerDirtyClose } from "@/components/sce/composer/SceComposerDirtyCloseContext";
import { useOptionalContextDirtyNavigation } from "@/lib/context-tabs";
import {
  buildMeetingWorkspaceLocationHref,
  MEETING_WORKSPACE_LEGACY_BEREICH_PARAM,
  resolveMeetingWorkspaceTabFromBereichParam,
  resolveMeetingWorkspaceTabFromHash,
  stripLegacyBereichFromSearchParams,
} from "@/lib/meetings/meeting-workspace-section-url";
import {
  measureMeetingWorkspaceScrollOffset,
  scrollMeetingWorkspaceSectionHeading,
} from "@/lib/meetings/meeting-workspace-scroll";
import type { MeetingWorkspaceTabId } from "@/lib/nav/meeting-workspace-tab-config";
import { MEETING_WORKSPACE_SECTION_ORDER } from "@/lib/nav/meeting-workspace-tab-config";

type Counts = {
  traktanden: number;
  beschluesse: number;
  pendenzenOpen: number;
  teilnehmer: number;
};

type SectionsContextValue = {
  expandedSections: ReadonlySet<MeetingWorkspaceTabId>;
  highlightedSection: MeetingWorkspaceTabId;
  requestToggleSection: (sectionId: MeetingWorkspaceTabId) => void;
  navigateToSection: (sectionId: MeetingWorkspaceTabId, options?: { skipScroll?: boolean }) => void;
  hrefForSection: (sectionId: MeetingWorkspaceTabId) => string;
  registerSectionHeading: (sectionId: MeetingWorkspaceTabId, el: HTMLHeadingElement | null) => void;
  registerSectionNav: (el: HTMLElement | null) => void;
  sectionScrollMarginPx: number;
  hasActivatedLazySection: (sectionId: MeetingWorkspaceTabId) => boolean;
  counts: Counts;
};

const MeetingWorkspaceSectionsContext = createContext<SectionsContextValue | null>(null);

function resolveDeepLinkTab(
  hash: string,
  bereich: string | null,
): MeetingWorkspaceTabId | null {
  return resolveMeetingWorkspaceTabFromHash(hash) ?? resolveMeetingWorkspaceTabFromBereichParam(bereich);
}

function initialExpandedSections(deepLink: MeetingWorkspaceTabId | null): Set<MeetingWorkspaceTabId> {
  if (deepLink) {
    return new Set([deepLink]);
  }
  return new Set<MeetingWorkspaceTabId>(["traktanden"]);
}

type ProviderProps = {
  children: ReactNode;
  counts: Counts;
};

export function MeetingWorkspaceSectionsProvider({ children, counts }: ProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dirtyNav = useOptionalContextDirtyNavigation();
  const dirtyClose = useOptionalSceComposerDirtyClose();

  const bereichParam = useMemo(() => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(MEETING_WORKSPACE_LEGACY_BEREICH_PARAM);
    }
    const raw = searchParams[MEETING_WORKSPACE_LEGACY_BEREICH_PARAM];
    if (Array.isArray(raw)) return raw[0] ?? null;
    return raw ?? null;
  }, [searchParams]);

  const [expandedSections, setExpandedSections] = useState<Set<MeetingWorkspaceTabId>>(() => {
    if (typeof window === "undefined") {
      const deep = resolveMeetingWorkspaceTabFromBereichParam(bereichParam);
      return initialExpandedSections(deep);
    }
    const deep = resolveDeepLinkTab(window.location.hash, bereichParam);
    return initialExpandedSections(deep);
  });

  const [highlightedSection, setHighlightedSection] = useState<MeetingWorkspaceTabId>(() => {
    if (typeof window === "undefined") {
      return resolveMeetingWorkspaceTabFromBereichParam(bereichParam) ?? "traktanden";
    }
    return resolveDeepLinkTab(window.location.hash, bereichParam) ?? "traktanden";
  });

  const headingRefs = useRef(new Map<MeetingWorkspaceTabId, HTMLHeadingElement | null>());
  const navRef = useRef<HTMLElement | null>(null);
  const [lazyActivated, setLazyActivated] = useState<Set<MeetingWorkspaceTabId>>(
    () => new Set(expandedSections),
  );
  const [scrollMarginPx, setScrollMarginPx] = useState(144);

  const urlSearch = useMemo(() => {
    if (searchParams instanceof URLSearchParams) {
      return new URLSearchParams(searchParams);
    }
    const next = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => next.append(key, v));
      } else if (typeof value === "string" && value.length > 0) {
        next.set(key, value);
      }
    });
    return next;
  }, [searchParams]);

  const hrefForSection = useCallback(
    (sectionId: MeetingWorkspaceTabId) =>
      buildMeetingWorkspaceLocationHref({
        pathname,
        searchParams: urlSearch,
        tab: sectionId,
      }),
    [pathname, urlSearch],
  );

  const scrollToSection = useCallback((sectionId: MeetingWorkspaceTabId) => {
    const heading = headingRefs.current.get(sectionId);
    if (heading) {
      scrollMeetingWorkspaceSectionHeading(heading, navRef.current);
    }
  }, []);

  const pushSectionHash = useCallback(
    (sectionId: MeetingWorkspaceTabId, replace = false) => {
      const href = hrefForSection(sectionId);
      const nextUrl = `${href}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextUrl === current) {
        return;
      }
      if (replace) {
        window.history.replaceState(null, "", nextUrl);
      } else {
        window.history.pushState(null, "", nextUrl);
      }
    },
    [hrefForSection],
  );

  const activateLazySection = useCallback((sectionId: MeetingWorkspaceTabId) => {
    setLazyActivated((prev) => {
      if (prev.has(sectionId)) return prev;
      const next = new Set(prev);
      next.add(sectionId);
      return next;
    });
  }, []);

  const navigateToSection = useCallback(
    (sectionId: MeetingWorkspaceTabId, options?: { skipScroll?: boolean }) => {
      activateLazySection(sectionId);
      setExpandedSections((prev) => {
        if (prev.has(sectionId)) return prev;
        const next = new Set(prev);
        next.add(sectionId);
        return next;
      });
      setHighlightedSection(sectionId);
      pushSectionHash(sectionId);
      if (!options?.skipScroll) {
        requestAnimationFrame(() => scrollToSection(sectionId));
      }
    },
    [activateLazySection, pushSectionHash, scrollToSection],
  );

  const requestToggleSection = useCallback(
    (sectionId: MeetingWorkspaceTabId) => {
      const isExpanded = expandedSections.has(sectionId);
      const collapse = () => {
        setExpandedSections((prev) => {
          const next = new Set(prev);
          next.delete(sectionId);
          return next;
        });
      };
      const expand = () => {
        activateLazySection(sectionId);
        setExpandedSections((prev) => {
          const next = new Set(prev);
          next.add(sectionId);
          return next;
        });
        setHighlightedSection(sectionId);
        pushSectionHash(sectionId);
        requestAnimationFrame(() => scrollToSection(sectionId));
      };

      if (isExpanded) {
        if (dirtyNav?.isDirty && dirtyClose) {
          dirtyClose.requestClose(collapse);
          return;
        }
        collapse();
        return;
      }
      expand();
    },
    [
      activateLazySection,
      dirtyClose,
      dirtyNav?.isDirty,
      expandedSections,
      pushSectionHash,
      scrollToSection,
    ],
  );

  const registerSectionHeading = useCallback(
    (sectionId: MeetingWorkspaceTabId, el: HTMLHeadingElement | null) => {
      headingRefs.current.set(sectionId, el);
    },
    [],
  );

  const registerSectionNav = useCallback((el: HTMLElement | null) => {
    navRef.current = el;
    if (el) {
      setScrollMarginPx(measureMeetingWorkspaceScrollOffset(el));
    }
  }, []);

  const hasActivatedLazySection = useCallback(
    (sectionId: MeetingWorkspaceTabId) => {
      return lazyActivated.has(sectionId);
    },
    [lazyActivated],
  );

  useEffect(() => {
    setLazyActivated((prev) => {
      const next = new Set(prev);
      expandedSections.forEach((id) => next.add(id));
      return next;
    });
  }, [expandedSections]);

  const legacyBereichMigrated = useRef(false);
  useEffect(() => {
    if (legacyBereichMigrated.current) return;
    legacyBereichMigrated.current = true;

    const deep = resolveDeepLinkTab(window.location.hash, bereichParam);
    if (deep) {
      navigateToSection(deep, { skipScroll: !window.location.hash });
    }
    if (bereichParam) {
      const stripped = stripLegacyBereichFromSearchParams(urlSearch);
      const search = stripped.toString();
      const hash = deep ? hrefForSection(deep).split("#")[1] : window.location.hash;
      const canonical = `${pathname}${search ? `?${search}` : ""}${hash ? `#${hash.replace(/^#/, "")}` : ""}`;
      window.history.replaceState(null, "", canonical);
    }
  }, [bereichParam, hrefForSection, navigateToSection, pathname, urlSearch]);

  useEffect(() => {
    function onHashChange() {
      const tab = resolveMeetingWorkspaceTabFromHash(window.location.hash);
      if (!tab) return;
      navigateToSection(tab);
    }
    function onNavigateTab(event: Event) {
      const detail = (event as CustomEvent<{ tab?: MeetingWorkspaceTabId }>).detail;
      if (detail?.tab) {
        navigateToSection(detail.tab);
      }
    }
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("meeting-workspace-navigate-tab", onNavigateTab);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("meeting-workspace-navigate-tab", onNavigateTab);
    };
  }, [navigateToSection]);

  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;

    const offset = measureMeetingWorkspaceScrollOffset(navEl);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const top = visible[0];
        if (!top) return;
        const id = top.target.getAttribute("data-meeting-section-id");
        if (id && MEETING_WORKSPACE_SECTION_ORDER.includes(id as MeetingWorkspaceTabId)) {
          setHighlightedSection(id as MeetingWorkspaceTabId);
        }
      },
      {
        root: null,
        rootMargin: `-${offset}px 0px -55% 0px`,
        threshold: [0, 0.1, 0.25],
      },
    );

    MEETING_WORKSPACE_SECTION_ORDER.forEach((sectionId) => {
      const heading = headingRefs.current.get(sectionId);
      if (heading) {
        heading.setAttribute("data-meeting-section-id", sectionId);
        observer.observe(heading);
      }
    });

    return () => observer.disconnect();
  }, [expandedSections, scrollMarginPx]);

  const value = useMemo(
    () => ({
      expandedSections,
      highlightedSection,
      requestToggleSection,
      navigateToSection,
      hrefForSection,
      registerSectionHeading,
      registerSectionNav,
      sectionScrollMarginPx: scrollMarginPx,
      hasActivatedLazySection,
      counts,
    }),
    [
      counts,
      expandedSections,
      hasActivatedLazySection,
      highlightedSection,
      hrefForSection,
      navigateToSection,
      registerSectionHeading,
      registerSectionNav,
      requestToggleSection,
      scrollMarginPx,
    ],
  );

  return (
    <MeetingWorkspaceSectionsContext.Provider value={value}>
      {children}
    </MeetingWorkspaceSectionsContext.Provider>
  );
}

export function useMeetingWorkspaceSections(): SectionsContextValue {
  const ctx = useContext(MeetingWorkspaceSectionsContext);
  if (!ctx) {
    throw new Error("useMeetingWorkspaceSections requires MeetingWorkspaceSectionsProvider");
  }
  return ctx;
}