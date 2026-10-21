"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type OrgUnitContextualPreviewSuppressReason =
  | "none"
  | "node-drag"
  | "reparent-drag"
  | "panning"
  | "touch";

export type UseOrgUnitContextualPreviewOptions = {
  openDelayMs?: number;
  closeDelayMs?: number;
  suppressReason?: OrgUnitContextualPreviewSuppressReason;
  /** When false (touch / coarse pointer), preview is disabled — inspector is the surface. */
  hoverPreviewEnabled?: boolean;
  /** Inspector-selected unit — hover/focus must not open a duplicate preview for this id only. */
  selectedUnitId?: string | null;
};

export type OrgUnitContextualPreviewState = {
  openUnitId: string | null;
  dismiss: () => void;
  onNodePointerEnter: (unitId: string) => void;
  onNodePointerLeave: (unitId: string) => void;
  onNodeFocus: (unitId: string) => void;
  onNodeBlur: (unitId: string, relatedTarget: EventTarget | null) => void;
  onPreviewPointerEnter: () => void;
  onPreviewPointerLeave: () => void;
  onPreviewFocus: () => void;
  onPreviewBlur: (relatedTarget: EventTarget | null) => void;
  isOpenFor: (unitId: string) => boolean;
};

const PREVIEW_ROOT_SELECTOR = "[data-org-contextual-preview-root]";

function isPreviewElement(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return Boolean(el.closest(PREVIEW_ROOT_SELECTOR));
}

export function useOrgUnitContextualPreview(
  options: UseOrgUnitContextualPreviewOptions = {},
): OrgUnitContextualPreviewState {
  const openDelayMs = options.openDelayMs ?? 400;
  const closeDelayMs = options.closeDelayMs ?? 160;
  const suppressReason = options.suppressReason ?? "none";
  const hoverPreviewEnabled = options.hoverPreviewEnabled ?? true;
  const selectedUnitId = options.selectedUnitId ?? null;

  const [openUnitId, setOpenUnitId] = useState<string | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverUnitRef = useRef<string | null>(null);
  const previewHoveredRef = useRef(false);
  const focusUnitRef = useRef<string | null>(null);
  const previewFocusedRef = useRef(false);

  const clearOpenTimer = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    setOpenUnitId(null);
    hoverUnitRef.current = null;
    previewHoveredRef.current = false;
  }, [clearCloseTimer, clearOpenTimer]);

  const scheduleOpen = useCallback(
    (unitId: string) => {
      if (!hoverPreviewEnabled || suppressReason !== "none") return;
      if (selectedUnitId && unitId === selectedUnitId) {
        clearOpenTimer();
        return;
      }
      clearOpenTimer();
      clearCloseTimer();
      openTimer.current = setTimeout(() => {
        setOpenUnitId(unitId);
      }, openDelayMs);
    },
    [
      clearCloseTimer,
      clearOpenTimer,
      hoverPreviewEnabled,
      openDelayMs,
      selectedUnitId,
      suppressReason,
    ],
  );

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      if (previewHoveredRef.current || previewFocusedRef.current) return;
      if (focusUnitRef.current) return;
      setOpenUnitId(null);
    }, closeDelayMs);
  }, [closeDelayMs, clearCloseTimer]);

  useEffect(() => {
    if (suppressReason !== "none") {
      dismiss();
    }
  }, [suppressReason, dismiss]);

  useEffect(() => {
    if (selectedUnitId && openUnitId === selectedUnitId) {
      setOpenUnitId(null);
      clearOpenTimer();
    }
  }, [clearOpenTimer, openUnitId, selectedUnitId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && openUnitId) {
        e.stopPropagation();
        dismiss();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [dismiss, openUnitId]);

  const onNodePointerEnter = useCallback(
    (unitId: string) => {
      hoverUnitRef.current = unitId;
      scheduleOpen(unitId);
    },
    [scheduleOpen],
  );

  const onNodePointerLeave = useCallback(
    (unitId: string) => {
      if (hoverUnitRef.current === unitId) hoverUnitRef.current = null;
      if (openUnitId === unitId || hoverUnitRef.current === null) {
        scheduleClose();
      }
    },
    [openUnitId, scheduleClose],
  );

  const onNodeFocus = useCallback(
    (unitId: string) => {
      focusUnitRef.current = unitId;
      scheduleOpen(unitId);
    },
    [scheduleOpen],
  );

  const onNodeBlur = useCallback(
    (unitId: string, relatedTarget: EventTarget | null) => {
      if (focusUnitRef.current === unitId) focusUnitRef.current = null;
      if (isPreviewElement(relatedTarget)) return;
      scheduleClose();
    },
    [scheduleClose],
  );

  const onPreviewPointerEnter = useCallback(() => {
    previewHoveredRef.current = true;
    clearCloseTimer();
  }, [clearCloseTimer]);

  const onPreviewPointerLeave = useCallback(() => {
    previewHoveredRef.current = false;
    scheduleClose();
  }, [scheduleClose]);

  const onPreviewFocus = useCallback(() => {
    previewFocusedRef.current = true;
    clearCloseTimer();
  }, [clearCloseTimer]);

  const onPreviewBlur = useCallback(
    (relatedTarget: EventTarget | null) => {
      previewFocusedRef.current = false;
      if (relatedTarget instanceof HTMLElement && relatedTarget.closest("[data-org-unit-node]")) {
        return;
      }
      scheduleClose();
    },
    [scheduleClose],
  );

  const isOpenFor = useCallback((unitId: string) => openUnitId === unitId, [openUnitId]);

  return {
    openUnitId,
    dismiss,
    onNodePointerEnter,
    onNodePointerLeave,
    onNodeFocus,
    onNodeBlur,
    onPreviewPointerEnter,
    onPreviewPointerLeave,
    onPreviewFocus,
    onPreviewBlur,
    isOpenFor,
  };
}

const HOVER_PREVIEW_MEDIA = "(hover: hover) and (pointer: fine)";

export function orgUnitHoverPreviewEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia(HOVER_PREVIEW_MEDIA).matches;
}

export function subscribeOrgUnitHoverPreviewEnabled(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(HOVER_PREVIEW_MEDIA);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
