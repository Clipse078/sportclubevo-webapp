"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { UmsetzungsplanungDragPayload } from "@/lib/club-development/umsetzungsplanung-dnd";

export type UmsetzungsplanungUnplannedScheduleHooks = {
  onOptimisticRemove?: (taskId: string) => void;
  onRollbackRestore?: (taskId: string) => void;
};

type UmsetzungsplanungDragContextValue = {
  dragging: UmsetzungsplanungDragPayload | null;
  beginDrag: (payload: UmsetzungsplanungDragPayload) => void;
  endDrag: () => void;
  canManagePlanning: boolean;
  activeDropPhaseId: string | null;
  setActiveDropPhaseId: (phaseId: string | null) => void;
  registerUnplannedScheduleHooks: (hooks: UmsetzungsplanungUnplannedScheduleHooks | null) => void;
  notifyOptimisticUnplannedRemove: (taskId: string) => void;
  notifyRollbackUnplannedRestore: (taskId: string) => void;
};

const UmsetzungsplanungDragContext = createContext<UmsetzungsplanungDragContextValue | null>(null);

export function UmsetzungsplanungDragProvider({
  canManagePlanning,
  children,
}: {
  canManagePlanning: boolean;
  children: ReactNode;
}) {
  const [dragging, setDragging] = useState<UmsetzungsplanungDragPayload | null>(null);
  const [activeDropPhaseId, setActiveDropPhaseId] = useState<string | null>(null);
  const unplannedHooksRef = useRef<UmsetzungsplanungUnplannedScheduleHooks | null>(null);

  const beginDrag = useCallback((payload: UmsetzungsplanungDragPayload) => {
    setDragging(payload);
  }, []);
  const endDrag = useCallback(() => {
    setDragging(null);
    setActiveDropPhaseId(null);
  }, []);

  const registerUnplannedScheduleHooks = useCallback((hooks: UmsetzungsplanungUnplannedScheduleHooks | null) => {
    unplannedHooksRef.current = hooks;
  }, []);

  const notifyOptimisticUnplannedRemove = useCallback((taskId: string) => {
    unplannedHooksRef.current?.onOptimisticRemove?.(taskId);
  }, []);

  const notifyRollbackUnplannedRestore = useCallback((taskId: string) => {
    unplannedHooksRef.current?.onRollbackRestore?.(taskId);
  }, []);

  const value = useMemo(
    () => ({
      dragging,
      beginDrag,
      endDrag,
      canManagePlanning,
      activeDropPhaseId,
      setActiveDropPhaseId,
      registerUnplannedScheduleHooks,
      notifyOptimisticUnplannedRemove,
      notifyRollbackUnplannedRestore,
    }),
    [
      activeDropPhaseId,
      beginDrag,
      canManagePlanning,
      dragging,
      endDrag,
      notifyOptimisticUnplannedRemove,
      notifyRollbackUnplannedRestore,
      registerUnplannedScheduleHooks,
    ],
  );
  return (
    <UmsetzungsplanungDragContext.Provider value={value}>{children}</UmsetzungsplanungDragContext.Provider>
  );
}

export function useUmsetzungsplanungDrag() {
  const ctx = useContext(UmsetzungsplanungDragContext);
  if (!ctx) {
    throw new Error("useUmsetzungsplanungDrag must be used within UmsetzungsplanungDragProvider");
  }
  return ctx;
}

export function useUmsetzungsplanungDragOptional() {
  return useContext(UmsetzungsplanungDragContext);
}