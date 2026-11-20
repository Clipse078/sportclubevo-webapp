"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UmsetzungsplanungDragPayload } from "@/lib/club-development/umsetzungsplanung-dnd";

type UmsetzungsplanungDragContextValue = {
  dragging: UmsetzungsplanungDragPayload | null;
  beginDrag: (payload: UmsetzungsplanungDragPayload) => void;
  endDrag: () => void;
  canManagePlanning: boolean;
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
  const beginDrag = useCallback((payload: UmsetzungsplanungDragPayload) => {
    setDragging(payload);
  }, []);
  const endDrag = useCallback(() => setDragging(null), []);
  const value = useMemo(
    () => ({ dragging, beginDrag, endDrag, canManagePlanning }),
    [beginDrag, canManagePlanning, dragging, endDrag],
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