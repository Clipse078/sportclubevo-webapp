"use client";

import { useEffect, useRef } from "react";
import { useOptionalContextDirtyNavigation } from "@/lib/context-tabs";
import { sceSerializeFormSnapshot } from "@/lib/ux/sce-composer-form-snapshot";

type Options = {
  /** When false, dirty reporting is disabled (e.g. after successful save reset). @default true */
  enabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

/**
 * Compares live form snapshot to the mount baseline — not merely focused fields.
 */
export function useSceComposerFormDirty(snapshot: unknown, options?: Options) {
  const dirtyNav = useOptionalContextDirtyNavigation();
  const enabled = options?.enabled !== false;
  const baselineRef = useRef<string | null>(null);

  if (baselineRef.current === null && enabled) {
    baselineRef.current = sceSerializeFormSnapshot(snapshot);
  }

  const onDirtyChange = options?.onDirtyChange;

  useEffect(() => {
    if (!enabled) {
      dirtyNav?.setDirty(false);
      onDirtyChange?.(false);
      return;
    }
    const baseline = baselineRef.current ?? sceSerializeFormSnapshot(snapshot);
    const dirty = sceSerializeFormSnapshot(snapshot) !== baseline;
    dirtyNav?.setDirty(dirty);
    onDirtyChange?.(dirty);
  }, [dirtyNav, enabled, onDirtyChange, snapshot]);

  useEffect(
    () => () => {
      dirtyNav?.setDirty(false);
    },
    [dirtyNav],
  );

  const resetBaseline = () => {
    baselineRef.current = sceSerializeFormSnapshot(snapshot);
    dirtyNav?.setDirty(false);
    options?.onDirtyChange?.(false);
  };

  return { resetBaseline };
}
