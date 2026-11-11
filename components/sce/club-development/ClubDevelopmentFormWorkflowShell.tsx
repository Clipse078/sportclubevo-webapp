"use client";

import { useEffect, type ReactNode } from "react";
import { useOptionalContextDirtyNavigation } from "@/lib/context-tabs";
import { SceComposerDirtyCloseProvider } from "@/components/sce/composer/SceComposerDirtyCloseContext";

type Props = {
  children: ReactNode;
};

function ClubDevelopmentBeforeUnloadGuard() {
  const dirtyNav = useOptionalContextDirtyNavigation();

  useEffect(() => {
    if (!dirtyNav?.isDirty) {
      return;
    }
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirtyNav?.isDirty]);

  return null;
}

/**
 * Full-page Club Development create/edit — dirty guard + browser tab protection (SCE-UX-01B).
 */
export function ClubDevelopmentFormWorkflowShell({ children }: Props) {
  return (
    <SceComposerDirtyCloseProvider>
      <ClubDevelopmentBeforeUnloadGuard />
      {children}
    </SceComposerDirtyCloseProvider>
  );
}
