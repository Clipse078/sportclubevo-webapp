"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  SceComposerDirtyCloseProvider,
  useOptionalSceComposerDirtyClose,
} from "@/components/sce/composer/SceComposerDirtyCloseContext";
import { useOptionalContextDirtyNavigation } from "@/lib/context-tabs";

function MeetingWorkspaceBeforeUnloadGuard() {
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

function isModifiedClick(event: MouseEvent): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

function resolveGuardedInAppHref(
  anchor: HTMLAnchorElement,
  origin: string,
  currentPath: string,
): string | null {
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return null;
  }
  const rawHref = anchor.getAttribute("href");
  if (!rawHref || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
    return null;
  }
  if (rawHref.startsWith("#")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(rawHref, origin);
  } catch {
    return null;
  }

  if (url.origin !== origin) {
    return null;
  }

  const destination = `${url.pathname}${url.search}${url.hash}`;
  if (destination === currentPath) {
    return null;
  }

  return destination;
}

/** Intercepts same-origin navigations while the workspace has unsaved inline edits. */
export function MeetingWorkspaceInAppNavigationGuard() {
  const dirtyNav = useOptionalContextDirtyNavigation();
  const dirtyClose = useOptionalSceComposerDirtyClose();
  const router = useRouter();

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!dirtyNav?.isDirty || !dirtyClose) {
        return;
      }
      if (isModifiedClick(event)) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const origin = window.location.origin;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const destination = resolveGuardedInAppHref(anchor, origin, currentPath);
      if (!destination) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      dirtyClose.requestClose(() => {
        router.push(destination);
      });
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [dirtyClose, dirtyNav?.isDirty, router]);

  return null;
}

export function MeetingWorkspaceDirtyStateSync({ isDirty }: { isDirty: boolean }) {
  const dirtyNav = useOptionalContextDirtyNavigation();

  useEffect(() => {
    dirtyNav?.setDirty(isDirty);
    return () => dirtyNav?.setDirty(false);
  }, [dirtyNav, isDirty]);

  return null;
}

type ShellProps = {
  children: ReactNode;
};

/**
 * Dirty guard + in-app navigation + tab-close protection for the Meetings 2.0 workspace.
 */
export function MeetingWorkspaceDirtyShell({ children }: ShellProps) {
  return (
    <SceComposerDirtyCloseProvider>
      <MeetingWorkspaceInAppNavigationGuard />
      <MeetingWorkspaceBeforeUnloadGuard />
      {children}
    </SceComposerDirtyCloseProvider>
  );
}
