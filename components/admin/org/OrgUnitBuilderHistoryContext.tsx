"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  OrgBuilderCommandHistory,
  createOrgBuilderCommand,
  isOrgBuilderTextEditingTarget,
  type OrgBuilderCommand,
  type OrgBuilderHistorySnapshot,
} from "@/lib/org/org-builder-command-history";
import type { OrgLayoutPositionMap } from "@/lib/org/org-layout-persistence";
import {
  orgBuilderCreateOrgUnit,
  orgBuilderPutOrgUnit,
  orgBuilderTryDeleteCreatedUnit,
  type OrgUnitCreatePayload,
} from "@/lib/org/org-builder-authoritative-mutations";

type Feedback = { kind: "error" | "info"; message: string } | null;

type OrgBuilderHistoryContextValue = {
  snapshot: OrgBuilderHistorySnapshot;
  pushCommand: (command: OrgBuilderCommand) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  dismissPreview: () => void;
  registerDismissPreview: (fn: () => void) => void;
  feedback: Feedback;
  clearFeedback: () => void;
  pushNodeMove: (input: {
    unitName: string;
    before: OrgLayoutPositionMap;
    after: OrgLayoutPositionMap;
    apply: (map: OrgLayoutPositionMap) => void;
  }) => void;
  pushAutoLayout: (input: {
    before: OrgLayoutPositionMap;
    apply: (map: OrgLayoutPositionMap) => void;
  }) => void;
  pushReparent: (input: {
    unitId: string;
    unitName: string;
    beforeParentId: string | null;
    afterParentId: string | null;
    onRefresh: () => void;
  }) => void;
  pushCreate: (input: {
    unitName: string;
    payload: OrgUnitCreatePayload;
    createdId: string;
    onRefresh: () => void;
  }) => void;
  pushEdit: (input: {
    unitId: string;
    unitName: string;
    beforeBody: Record<string, unknown>;
    afterBody: Record<string, unknown>;
    onRefresh: () => void;
  }) => void;
};

const OrgBuilderHistoryContext = createContext<OrgBuilderHistoryContextValue | null>(null);

export function useOrgBuilderHistory(): OrgBuilderHistoryContextValue {
  const ctx = useContext(OrgBuilderHistoryContext);
  if (!ctx) {
    throw new Error("useOrgBuilderHistory must be used within OrgBuilderHistoryProvider");
  }
  return ctx;
}

export function useOptionalOrgBuilderHistory(): OrgBuilderHistoryContextValue | null {
  return useContext(OrgBuilderHistoryContext);
}

type ProviderProps = {
  children: ReactNode;
};

export function OrgBuilderHistoryProvider({ children }: ProviderProps) {
  const historyRef = useRef(new OrgBuilderCommandHistory());
  const dismissPreviewRef = useRef<() => void>(() => {});
  const [snapshot, setSnapshot] = useState<OrgBuilderHistorySnapshot>(() =>
    historyRef.current.getSnapshot(),
  );
  const [feedback, setFeedback] = useState<Feedback>(null);

  const sync = useCallback(() => {
    setSnapshot(historyRef.current.getSnapshot());
  }, []);

  const registerDismissPreview = useCallback((fn: () => void) => {
    dismissPreviewRef.current = fn;
  }, []);

  const dismissPreview = useCallback(() => {
    dismissPreviewRef.current();
  }, []);

  const pushCommand = useCallback(
    (command: OrgBuilderCommand) => {
      historyRef.current.push(command);
      sync();
    },
    [sync],
  );

  const undo = useCallback(async () => {
    dismissPreviewRef.current();
    setFeedback(null);
    try {
      await historyRef.current.undo();
      sync();
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Rückgängig fehlgeschlagen.",
      });
      sync();
    }
  }, [sync]);

  const redo = useCallback(async () => {
    dismissPreviewRef.current();
    setFeedback(null);
    try {
      await historyRef.current.redo();
      sync();
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Wiederholen fehlgeschlagen.",
      });
      sync();
    }
  }, [sync]);

  const pushNodeMove = useCallback(
    (input: {
      unitName: string;
      before: OrgLayoutPositionMap;
      after: OrgLayoutPositionMap;
      apply: (map: OrgLayoutPositionMap) => void;
    }) => {
      pushCommand(
        createOrgBuilderCommand({
          label: `${input.unitName} verschoben`,
          scope: "presentation",
          undo: async () => {
            input.apply(input.before);
          },
          redo: async () => {
            input.apply(input.after);
          },
        }),
      );
    },
    [pushCommand],
  );

  const pushAutoLayout = useCallback(
    (input: { before: OrgLayoutPositionMap; apply: (map: OrgLayoutPositionMap) => void }) => {
      pushCommand(
        createOrgBuilderCommand({
          label: "Auto-Layout angewendet",
          scope: "presentation",
          undo: async () => {
            input.apply(input.before);
          },
          redo: async () => {
            input.apply({});
          },
        }),
      );
    },
    [pushCommand],
  );

  const pushReparent = useCallback(
    (input: {
      unitId: string;
      unitName: string;
      beforeParentId: string | null;
      afterParentId: string | null;
      onRefresh: () => void;
    }) => {
      pushCommand(
        createOrgBuilderCommand({
          label: `${input.unitName} neu zugeordnet`,
          scope: "authoritative",
          undo: async () => {
            const result = await orgBuilderPutOrgUnit(input.unitId, {
              parentId: input.beforeParentId,
            });
            if (!result.ok) throw new Error(result.error);
            input.onRefresh();
          },
          redo: async () => {
            const result = await orgBuilderPutOrgUnit(input.unitId, {
              parentId: input.afterParentId,
            });
            if (!result.ok) throw new Error(result.error);
            input.onRefresh();
          },
        }),
      );
    },
    [pushCommand],
  );

  const pushCreate = useCallback(
    (input: {
      unitName: string;
      payload: OrgUnitCreatePayload;
      createdId: string;
      onRefresh: () => void;
    }) => {
      pushCommand(
        createOrgBuilderCommand({
          label: `${input.unitName} erstellt`,
          scope: "authoritative",
          undo: async () => {
            const result = await orgBuilderTryDeleteCreatedUnit(input.createdId);
            if (!result.ok) throw new Error(result.error);
            input.onRefresh();
          },
          redo: async () => {
            const result = await orgBuilderCreateOrgUnit(input.payload);
            if (!result.ok) throw new Error(result.error);
            input.onRefresh();
          },
        }),
      );
    },
    [pushCommand],
  );

  const pushEdit = useCallback(
    (input: {
      unitId: string;
      unitName: string;
      beforeBody: Record<string, unknown>;
      afterBody: Record<string, unknown>;
      onRefresh: () => void;
    }) => {
      pushCommand(
        createOrgBuilderCommand({
          label: `${input.unitName} bearbeitet`,
          scope: "authoritative",
          undo: async () => {
            const result = await orgBuilderPutOrgUnit(input.unitId, input.beforeBody);
            if (!result.ok) throw new Error(result.error);
            input.onRefresh();
          },
          redo: async () => {
            const result = await orgBuilderPutOrgUnit(input.unitId, input.afterBody);
            if (!result.ok) throw new Error(result.error);
            input.onRefresh();
          },
        }),
      );
    },
    [pushCommand],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isOrgBuilderTextEditingTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        void undo();
        return;
      }
      if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        void redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

  const value = useMemo(
    (): OrgBuilderHistoryContextValue => ({
      snapshot,
      pushCommand,
      undo,
      redo,
      dismissPreview,
      registerDismissPreview,
      feedback,
      clearFeedback: () => setFeedback(null),
      pushNodeMove,
      pushAutoLayout,
      pushReparent,
      pushCreate,
      pushEdit,
    }),
    [
      snapshot,
      pushCommand,
      undo,
      redo,
      dismissPreview,
      registerDismissPreview,
      feedback,
      pushNodeMove,
      pushAutoLayout,
      pushReparent,
      pushCreate,
      pushEdit,
    ],
  );

  return (
    <OrgBuilderHistoryContext.Provider value={value}>{children}</OrgBuilderHistoryContext.Provider>
  );
}
