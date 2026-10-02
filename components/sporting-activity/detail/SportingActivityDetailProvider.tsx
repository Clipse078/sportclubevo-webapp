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
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import type { SportingActivityDetail } from "@/lib/sporting-activity-detail/types";
import {
  buildSportingActivityDetailHrefFromResourceKey,
  isSportingActivityDetailHref,
} from "@/lib/sporting-activity-detail/href";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { SportingActivityDetailContent } from "./SportingActivityDetailContent";
import { SportingActivityDetailSkeleton } from "./SportingActivityDetailSkeleton";
type SportingActivityDetailContextValue = {
  openFromHref: (href: string, trigger?: HTMLElement | null) => void;
  openFromResourceKey: (resourceKey: string, trigger?: HTMLElement | null) => void;
};

const SportingActivityDetailContext = createContext<SportingActivityDetailContextValue | null>(
  null,
);

export function useSportingActivityDetail(): SportingActivityDetailContextValue {
  const ctx = useContext(SportingActivityDetailContext);
  if (!ctx) {
    throw new Error("useSportingActivityDetail must be used within SportingActivityDetailProvider");
  }
  return ctx;
}

export function useOptionalSportingActivityDetail(): SportingActivityDetailContextValue | null {
  return useContext(SportingActivityDetailContext);
}

function parseDetailFetchUrl(href: string): string | null {
  if (!isSportingActivityDetailHref(href)) {
    return null;
  }
  const trainingPrefix = "/dashboard/activity/training-session/";
  const eventPrefix = "/dashboard/activity/event/";
  if (href.startsWith(trainingPrefix)) {
    const sessionId = decodeURIComponent(href.slice(trainingPrefix.length).split("?")[0] ?? "");
    return sessionId
      ? `/api/dashboard/sporting-activity-detail?trainingSessionId=${encodeURIComponent(sessionId)}`
      : null;
  }
  if (href.startsWith(eventPrefix)) {
    const eventId = decodeURIComponent(href.slice(eventPrefix.length).split("?")[0] ?? "");
    return eventId
      ? `/api/dashboard/sporting-activity-detail?eventId=${encodeURIComponent(eventId)}`
      : null;
  }
  return null;
}

export type SportingActivityDetailProviderProps = {
  children: ReactNode;
  fmtCfg: TenantFormatConfig;
};

export function SportingActivityDetailProvider({
  children,
  fmtCfg,
}: SportingActivityDetailProviderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<SportingActivityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = null;
    const trigger = lastTriggerRef.current;
    window.setTimeout(() => {
      trigger?.focus();
      lastTriggerRef.current = null;
    }, 0);
  }, []);

  const loadDetail = useCallback(async (href: string) => {
    const fetchUrl = parseDetailFetchUrl(href);
    if (!fetchUrl) {
      router.push(href);
      return;
    }

    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setOpen(true);
    setLoading(true);
    setErrorMessage(null);
    setDetail(null);

    try {
      const response = await fetch(fetchUrl, { signal: controller.signal });
      if (!response.ok) {
        setErrorMessage("Diese Aktivität ist nicht mehr verfügbar.");
        setLoading(false);
        return;
      }
      const payload = (await response.json()) as { detail: SportingActivityDetail };
      setDetail(payload.detail);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }
      setErrorMessage("Diese Aktivität ist nicht mehr verfügbar.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const openFromHref = useCallback(
    (href: string, trigger?: HTMLElement | null) => {
      if (!isSportingActivityDetailHref(href)) {
        router.push(href);
        return;
      }
      if (trigger) {
        lastTriggerRef.current = trigger;
      }
      void loadDetail(href);
    },
    [loadDetail, router],
  );

  const openFromResourceKey = useCallback(
    (resourceKey: string, trigger?: HTMLElement | null) => {
      const href = buildSportingActivityDetailHrefFromResourceKey(resourceKey);
      if (!href) {
        return;
      }
      openFromHref(href, trigger);
    },
    [openFromHref],
  );

  const ctx = useMemo(
    (): SportingActivityDetailContextValue => ({
      openFromHref,
      openFromResourceKey,
    }),
    [openFromHref, openFromResourceKey],
  );

  const sheetTitle = "Aktivität";

  const refreshDetail = useCallback(() => {
    if (!detail) return;
    const href = buildSportingActivityDetailHrefFromResourceKey(detail.resourceKey);
    if (href) {
      void loadDetail(href);
    }
  }, [detail, loadDetail]);

  useEffect(() => {
    return () => {
      fetchAbortRef.current?.abort();
    };
  }, []);

  return (
    <SportingActivityDetailContext.Provider value={ctx}>
      {children}
      <Sheet
        open={open}
        onClose={close}
        title={sheetTitle}
        panelClassName="w-full sm:max-w-[min(680px,100vw)] sm:w-[min(680px,92vw)]"
      >
        {loading ? <SportingActivityDetailSkeleton /> : null}
        {!loading && errorMessage ? (
          <p className="text-[0.875rem] text-[var(--text-2)]" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {!loading && detail ? (
          <SportingActivityDetailContent
            detail={detail}
            fmtCfg={fmtCfg}
            onParticipationUpdated={refreshDetail}
            layout="sheet"
          />
        ) : null}
      </Sheet>
    </SportingActivityDetailContext.Provider>
  );
}
