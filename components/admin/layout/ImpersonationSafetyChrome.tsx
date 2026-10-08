"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ImpersonationBanner from "@/components/admin/layout/ImpersonationBanner";

export type ImpersonationChromeState = {
  isImpersonating: boolean;
  effectiveDisplayName: string;
  actorDisplayName: string;
};

type Props = {
  initialState: ImpersonationChromeState;
};

async function fetchImpersonationChromeState(): Promise<ImpersonationChromeState> {
  const response = await fetch("/api/auth/impersonation-context", {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (response.status === 401) {
    return { isImpersonating: false, effectiveDisplayName: "", actorDisplayName: "" };
  }
  const data = (await response.json()) as {
    isImpersonating?: boolean;
    effectiveDisplayName?: string;
    actorDisplayName?: string;
  };
  if (!data.isImpersonating) {
    return { isImpersonating: false, effectiveDisplayName: "", actorDisplayName: "" };
  }
  return {
    isImpersonating: true,
    effectiveDisplayName: data.effectiveDisplayName ?? "",
    actorDisplayName: data.actorDisplayName ?? "Administrator",
  };
}

/**
 * Canonical impersonation safety chrome — revalidates on every authenticated route
 * change so unauthorized redirects cannot hide exit controls while the session
 * remains impersonating.
 */
export default function ImpersonationSafetyChrome({ initialState }: Props) {
  const pathname = usePathname();
  const [state, setState] = useState(initialState);

  const syncFromServer = useCallback(async () => {
    try {
      const next = await fetchImpersonationChromeState();
      setState(next);
    } catch {
      /* keep last known chrome on transient network errors */
    }
  }, []);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  useEffect(() => {
    void syncFromServer();
  }, [pathname, syncFromServer]);

  if (!state.isImpersonating) {
    return null;
  }

  return (
    <ImpersonationBanner
      effectiveDisplayName={state.effectiveDisplayName}
      actorDisplayName={state.actorDisplayName}
    />
  );
}
