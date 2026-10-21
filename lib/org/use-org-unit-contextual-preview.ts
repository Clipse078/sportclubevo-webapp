"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  anchorRectFromElement,
  isPointerEligibleForHoverPreview,
  type OrgUnitPreviewAnchorRect,
} from "@/lib/org/org-unit-hover-eligibility";

export type OrgUnitContextualPreviewSuppressReason =
  | "none"
  | "node-drag"
  | "reparent-drag"
  | "panning"
  | "touch";

export type OrgUnitContextualPreviewPointerEnter = {
  pointerType: string;
  anchor: OrgUnitPreviewAnchorRect;
  element: HTMLElement;
};

export type UseOrgUnitContextualPreviewOptions = {
  openDelayMs?: number;
  closeDelayMs?: number;
  suppressReason?: OrgUnitContextualPreviewSuppressReason;
  /** Inspector-selected unit — hover/focus must not open a duplicate preview for this id only. */
  selectedUnitId?: string | null;
};

export type OrgUnitContextualPreviewState = {
  openUnitId: string | null;
  openAnchor: OrgUnitPreviewAnchorRect | null;
  dismiss: () => void;
  onNodePointerEnter: (unitId: string, source: OrgUnitContextualPreviewPointerEnter) => void;
  onNodePointerLeave: (unitId: string) => void;
  onNodeFocus: (unitId: string, source?: { element: HTMLElement }) => void;
  onNodeBlur: (unitId: string, relatedTarget: EventTarget | null) => void;
  onPreviewPointerEnter: () => void;
  onPreviewPointerLeave: () => void;
  onPreviewFocus: () => void;
  onPreviewBlur: (relatedTarget: EventTarget | null) => void;
  refreshOpenAnchor: () => void;
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
  const selectedUnitId = options.selectedUnitId ?? null;

  const [openUnitId, setOpenUnitId] = useState<string | null>(null);
  const [openAnchor, setOpenAnchor] = useState<OrgUnitPreviewAnchorRect | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverUnitRef = useRef<string | null>(null);
  const previewHoveredRef = useRef(false);
  const focusUnitRef = useRef<string | null>(null);
  const previewFocusedRef = useRef(false);
  const anchorElementRef = useRef<HTMLElement | null>(null);
  const pendingAnchorRef = useRef<OrgUnitPreviewAnchorRect | null>(null);

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
    setOpenAnchor(null);
    hoverUnitRef.current = null;
    previewHoveredRef.current = false;
    anchorElementRef.current = null;
    pendingAnchorRef.current = null;
  }, [clearCloseTimer, clearOpenTimer]);

  const scheduleOpen = useCallback(
    (unitId: string) => {
      if (suppressReason !== "none") return;
      if (selectedUnitId && unitId === selectedUnitId) {
        clearOpenTimer();
        return;
      }
      clearOpenTimer();
      clearCloseTimer();
      openTimer.current = setTimeout(() => {
        const anchor =
          pendingAnchorRef.current ??
          (anchorElementRef.current
            ? anchorRectFromElement(anchorElementRef.current)
            : null);
        setOpenAnchor(anchor);
        setOpenUnitId(unitId);
      }, openDelayMs);
    },
    [clearCloseTimer, clearOpenTimer, openDelayMs, selectedUnitId, suppressReason],
  );

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      if (previewHoveredRef.current || previewFocusedRef.current) return;
      if (focusUnitRef.current) return;
      setOpenUnitId(null);
      setOpenAnchor(null);
    }, closeDelayMs);
  }, [closeDelayMs, clearCloseTimer]);

  const refreshOpenAnchor = useCallback(() => {
    if (!openUnitId || !anchorElementRef.current) return;
    setOpenAnchor(anchorRectFromElement(anchorElementRef.current));
  }, [openUnitId]);

  useEffect(() => {
    if (suppressReason !== "none") {
      dismiss();
    }
  }, [suppressReason, dismiss]);

  useEffect(() => {
    if (selectedUnitId && openUnitId === selectedUnitId) {
      setOpenUnitId(null);
      setOpenAnchor(null);
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
    (unitId: string, source: OrgUnitContextualPreviewPointerEnter) => {
      if (!isPointerEligibleForHoverPreview(source.pointerType)) return;
      hoverUnitRef.current = unitId;
      anchorElementRef.current = source.element;
      pendingAnchorRef.current = source.anchor;
      if (openUnitId === unitId) {
        setOpenAnchor(source.anchor);
      }
      scheduleOpen(unitId);
    },
    [openUnitId, scheduleOpen],
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
    (unitId: string, source?: { element: HTMLElement }) => {
      focusUnitRef.current = unitId;
      if (source?.element) {
        anchorElementRef.current = source.element;
        pendingAnchorRef.current = anchorRectFromElement(source.element);
      }
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
    openAnchor,
    dismiss,
    onNodePointerEnter,
    onNodePointerLeave,
    onNodeFocus,
    onNodeBlur,
    onPreviewPointerEnter,
    onPreviewPointerLeave,
    onPreviewFocus,
    onPreviewBlur,
    refreshOpenAnchor,
    isOpenFor,
  };
}
