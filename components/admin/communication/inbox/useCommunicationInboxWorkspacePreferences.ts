"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampListSplitPercent,
  clearInboxWorkspacePrefCache,
  defaultInboxWorkspacePreference,
  defaultListSplitPercentForLayout,
  readInboxWorkspacePrefCache,
  writeInboxWorkspacePrefCache,
  type InboxWorkspaceDensity,
  type InboxWorkspaceLayout,
  type InboxWorkspacePreferenceSnapshot,
} from "@/lib/communication/inbox/inbox-workspace-preferences";

type UseCommunicationInboxWorkspacePreferencesResult = {
  preference: InboxWorkspacePreferenceSnapshot;
  persistError: string | null;
  setLayout: (layout: InboxWorkspaceLayout, options?: { resetSplit?: boolean }) => void;
  setDensity: (density: InboxWorkspaceDensity) => void;
  setListSplitPercent: (percent: number, options?: { persist?: boolean }) => void;
  resetToDefaults: () => void;
  persistListSplitPercent: () => void;
};

export function useCommunicationInboxWorkspacePreferences(): UseCommunicationInboxWorkspacePreferencesResult {
  const cached = readInboxWorkspacePrefCache();
  const [preference, setPreference] = useState<InboxWorkspacePreferenceSnapshot>(
    () => cached ?? defaultInboxWorkspacePreference(),
  );
  const [persistError, setPersistError] = useState<string | null>(null);
  const preferenceRef = useRef(preference);
  preferenceRef.current = preference;
  const persistInFlightRef = useRef(false);
  /** True after local cache or any user-driven preference change — blocks stale GET hydration. */
  const userPreferenceTouchedRef = useRef(cached != null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/communication/inbox/workspace-preferences");
        if (!res.ok) return;
        const data = (await res.json()) as { preference?: InboxWorkspacePreferenceSnapshot };
        if (cancelled || !data.preference) return;
        if (userPreferenceTouchedRef.current) return;
        setPreference(data.preference);
        writeInboxWorkspacePrefCache(data.preference);
      } catch {
        // Server preference load is best-effort; defaults/cache remain.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (body: Record<string, unknown>, method: "PUT" | "DELETE") => {
    if (persistInFlightRef.current) return;
    persistInFlightRef.current = true;
    try {
      const res = await fetch("/api/communication/inbox/workspace-preferences", {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "PUT" ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        setPersistError("Ansicht konnte nicht gespeichert werden.");
        return;
      }
      setPersistError(null);
      const data = (await res.json()) as { preference?: InboxWorkspacePreferenceSnapshot };
      if (data.preference) {
        userPreferenceTouchedRef.current = false;
        setPreference(data.preference);
        writeInboxWorkspacePrefCache(data.preference);
      }
    } catch {
      setPersistError("Ansicht konnte nicht gespeichert werden.");
    } finally {
      persistInFlightRef.current = false;
    }
  }, []);

  const setLayout = useCallback(
    (layout: InboxWorkspaceLayout, options?: { resetSplit?: boolean }) => {
      const layoutChanged = layout !== preferenceRef.current.layout;
      const listSplitPercent =
        options?.resetSplit || layoutChanged
          ? defaultListSplitPercentForLayout(layout)
          : preferenceRef.current.listSplitPercent;
      const next: InboxWorkspacePreferenceSnapshot = {
        ...preferenceRef.current,
        layout,
        listSplitPercent,
        hasStoredPreference: true,
      };
      userPreferenceTouchedRef.current = true;
      setPreference(next);
      writeInboxWorkspacePrefCache(next);
      void persist({ layout, listSplitPercent }, "PUT");
    },
    [persist],
  );

  const setDensity = useCallback(
    (density: InboxWorkspaceDensity) => {
      const next = { ...preferenceRef.current, density, hasStoredPreference: true };
      userPreferenceTouchedRef.current = true;
      setPreference(next);
      writeInboxWorkspacePrefCache(next);
      void persist({ density }, "PUT");
    },
    [persist],
  );

  const setListSplitPercent = useCallback(
    (listSplitPercent: number, options?: { persist?: boolean }) => {
      const clamped = clampListSplitPercent(Math.round(listSplitPercent));
      const next = { ...preferenceRef.current, listSplitPercent: clamped, hasStoredPreference: true };
      userPreferenceTouchedRef.current = true;
      setPreference(next);
      writeInboxWorkspacePrefCache(next);
      if (options?.persist) {
        void persist({ listSplitPercent: clamped }, "PUT");
      }
    },
    [persist],
  );

  const persistListSplitPercent = useCallback(() => {
    void persist({ listSplitPercent: preferenceRef.current.listSplitPercent }, "PUT");
  }, [persist]);

  const resetToDefaults = useCallback(() => {
    const defaults = defaultInboxWorkspacePreference();
    userPreferenceTouchedRef.current = true;
    setPreference(defaults);
    clearInboxWorkspacePrefCache();
    void persist({}, "DELETE");
  }, [persist]);

  return {
    preference,
    persistError,
    setLayout,
    setDensity,
    setListSplitPercent,
    resetToDefaults,
    persistListSplitPercent,
  };
}
