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
import {
  buildMeetingWorkspaceLocationHref,
  MEETING_WORKSPACE_LEGACY_BEREICH_PARAM,
  resolveMeetingWorkspaceTabFromBereichParam,
  resolveMeetingWorkspaceTabFromHash,
  stripLegacyBereichFromSearchParams,
} from "@/lib/meetings/meeting-workspace-section-url";
import { measureMeetingWorkspaceScrollOffset } from "@/lib/meetings/meeting-workspace-scroll";
import {
  afterExpandedLayoutCommit,
  createProgrammaticScrollLock,
  MEETING_WORKSPACE_SPY_SUPPRESS_MS,
  scrollMeetingWorkspaceSectionHeadingAfterLayout,
  shouldSuppressScrollSpy,
  type ProgrammaticSectionScrollLock,
} from "@/lib/meetings/meeting-workspace-section-navigation";
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
  registerSectionPanel: (sectionId: MeetingWorkspaceTabId, el: HTMLElement | null) => void;
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
  const panelRefs = useRef(new Map<MeetingWorkspaceTabId, HTMLElement | null>());
  const navRef = useRef<HTMLElement | null>(null);
  const programmaticScrollLockRef = useRef<ProgrammaticSectionScrollLock | null>(null);
  const layoutResizeObserverRef = useRef<ResizeObserver | null>(null);
  const [lazyActivated, setLazyActivated] = useState<Set<MeetingWorkspaceTabId>>(
    () => new Set(expandedSections),
  );
  const [scrollMarginPx, setScrollMarginPx] = useState(144);
  const [headingRegistrationTick, setHeadingRegistrationTick] = useState(0);

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

  const queueSectionScroll = useCallback((sectionId: MeetingWorkspaceTabId) => {
    programmaticScrollLockRef.current = createProgrammaticScrollLock(sectionId);
    setHighlightedSection(sectionId);

    const runScroll = () => {
      const heading = headingRefs.current.get(sectionId);
      if (!heading) return;
      scrollMeetingWorkspaceSectionHeadingAfterLayout(heading, navRef.current);
    };

    layoutResizeObserverRef.current?.disconnect();
    const panel = panelRefs.current.get(sectionId);
    if (panel && typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(() => {
        if (!shouldSuppressScrollSpy(programmaticScrollLockRef.current)) return;
        afterExpandedLayoutCommit(runScroll);
      });
      resizeObserver.observe(panel);
      layoutResizeObserverRef.current = resizeObserver;
      window.setTimeout(() => resizeObserver.disconnect(), 2_500);
    }

    afterExpandedLayoutCommit(runScroll);

    const releaseLock = () => {
      if (programmaticScrollLockRef.current?.sectionId === sectionId) {
        programmaticScrollLockRef.current = null;
      }
      layoutResizeObserverRef.current?.disconnect();
    };

    if (typeof window !== "undefined" && "onscrollend" in window) {
      window.addEventListener("scrollend", releaseLock, { once: true });
    }
    window.setTimeout(releaseLock, MEETING_WORKSPACE_SPY_SUPPRESS_MS);
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
        afterExpandedLayoutCommit(() => queueSectionScroll(sectionId));
      }
    },
    [activateLazySection, pushSectionHash, queueSectionScroll],
  );

  const requestToggleSection = useCallback(
    (sectionId: MeetingWorkspaceTabId) => {
      const isExpanded = expandedSections.has(sectionId);
      if (isExpanded) {
        setExpandedSections((prev) => {
          const next = new Set(prev);
          next.delete(sectionId);
          return next;
        });
        return;
      }
      activateLazySection(sectionId);
      setExpandedSections((prev) => {
        const next = new Set(prev);
        next.add(sectionId);
        return next;
      });
      setHighlightedSection(sectionId);
      pushSectionHash(sectionId);
      afterExpandedLayoutCommit(() => queueSectionScroll(sectionId));
    },
    [activateLazySection, expandedSections, pushSectionHash, queueSectionScroll],
  );

  const registerSectionHeading = useCallback(
    (sectionId: MeetingWorkspaceTabId, el: HTMLHeadingElement | null) => {
      headingRefs.current.set(sectionId, el);
      if (el) {
        setHeadingRegistrationTick((n) => n + 1);
      }
    },
    [],
  );

  const registerSectionPanel = useCallback(
    (sectionId: MeetingWorkspaceTabId, el: HTMLElement | null) => {
      panelRefs.current.set(sectionId, el);
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
      const detail = (
        event as CustomEvent<{ tab?: MeetingWorkspaceTabId; openControlTestId?: string }>
      ).detail;
      if (detail?.tab) {
        navigateToSection(detail.tab);
        if (detail.openControlTestId) {
          window.setTimeout(() => {
            afterExpandedLayoutCommit(() => {
              const control = document.querySelector(
                `[data-testid="${detail.openControlTestId}"]`,
              );
              if (control instanceof HTMLElement) {
                control.click();
              }
            });
          }, 50);
        }
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

    const syncScrollMargin = () => {
      setScrollMarginPx(measureMeetingWorkspaceScrollOffset(navEl));
    };
    syncScrollMargin();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const appHeader = document.querySelector<HTMLElement>(".sce-global-app-header");
    const resizeObserver = new ResizeObserver(syncScrollMargin);
    resizeObserver.observe(navEl);
    if (appHeader) {
      resizeObserver.observe(appHeader);
    }
    return () => resizeObserver.disconnect();
  }, [headingRegistrationTick]);

  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;

    const offset = measureMeetingWorkspaceScrollOffset(navEl);
    const observer = new IntersectionObserver(
      (entries) => {
        const lock = programmaticScrollLockRef.current;
        if (shouldSuppressScrollSpy(lock)) {
          if (lock?.sectionId) {
            setHighlightedSection(lock.sectionId);
          }
          return;
        }
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
  }, [expandedSections, headingRegistrationTick, scrollMarginPx]);

  const value = useMemo(
    () => ({
      expandedSections,
      highlightedSection,
      requestToggleSection,
      navigateToSection,
      hrefForSection,
      registerSectionHeading,
      registerSectionPanel,
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
      registerSectionPanel,
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