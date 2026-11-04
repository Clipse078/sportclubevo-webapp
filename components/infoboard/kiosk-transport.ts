"use client";
/**
 * components/infoboard/kiosk-transport.ts
 *
 * Client-side canonical transport refresh for long-running Infoboard kiosks.
 */

import { useEffect, useMemo, useState } from "react";
import { resolveTenantTransportConfig } from "@/lib/transport/transport-config";
import { applyTransportDepartureLifecycle } from "@/lib/transport/transport-presentation";
import type { TransportResult } from "@/lib/transport/transport-types";

/** Re-evaluate departure expiry between provider refreshes. */
const TRANSPORT_LIFECYCLE_TICK_MS = 15_000;

function isTransportResult(value: unknown): value is TransportResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  return typeof (value as TransportResult).isAvailable === "boolean";
}

/**
 * Keeps kiosk transport aligned with the canonical server cache.
 */
export function useKioskTransport(
  initialTransport: TransportResult | null | undefined,
  refreshIntervalSeconds: number,
  tenantKey?: string | null,
  live = true,
): TransportResult | null | undefined {
  const [polledTransport, setPolledTransport] = useState(initialTransport);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [prevInitialTransport, setPrevInitialTransport] = useState(initialTransport);
  if (initialTransport !== prevInitialTransport) {
    setPrevInitialTransport(initialTransport);
    setPolledTransport(initialTransport);
  }

  useEffect(() => {
    if (!live) {
      return undefined;
    }

    const tickId = window.setInterval(() => {
      setNowMs(Date.now());
    }, TRANSPORT_LIFECYCLE_TICK_MS);

    return () => {
      window.clearInterval(tickId);
    };
  }, [live]);

  const lifecycleConfig = useMemo(
    () => (tenantKey ? resolveTenantTransportConfig(tenantKey) : null),
    [tenantKey],
  );

  const lifecycleTransport = useMemo(
    () =>
      applyTransportDepartureLifecycle(
        live ? polledTransport : initialTransport,
        new Date(nowMs),
        lifecycleConfig,
      ),
    [initialTransport, live, lifecycleConfig, nowMs, polledTransport],
  );

  useEffect(() => {
    if (!live || !tenantKey) {
      return undefined;
    }

    const resolvedTenantKey = tenantKey;
    let cancelled = false;

    async function refreshTransport(): Promise<void> {
      try {
        const response = await fetch("/api/public/infoboard/transport", {
          cache: "no-store",
          headers: {
            "X-Tenant-Slug": resolvedTenantKey,
          },
        });

        if (!response.ok) {
          return;
        }

        const payload: unknown = await response.json();
        if (!cancelled && isTransportResult(payload)) {
          setPolledTransport(payload);
        }
      } catch {
        // Preserve the last known departures on transient network errors.
      }
    }

    const syncId = window.setTimeout(() => {
      void refreshTransport();
    }, 1_000);

    const intervalId = window.setInterval(() => {
      void refreshTransport();
    }, refreshIntervalSeconds * 1_000);

    return () => {
      cancelled = true;
      window.clearTimeout(syncId);
      window.clearInterval(intervalId);
    };
  }, [live, refreshIntervalSeconds, tenantKey]);

  return live ? lifecycleTransport : initialTransport;
}
