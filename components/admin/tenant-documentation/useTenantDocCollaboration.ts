"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Y,
  applyYjsUpdateToDoc,
  TENANT_DOC_YJS_FRAGMENT,
} from "@/lib/tenant-documentation/tenant-doc-yjs-client";

export type CollaborationPresence = {
  userId: string;
  clientId: string;
  displayName: string;
  color: string;
  cursorJson: unknown;
  disconnected: boolean;
};

export type SaveStatus = "saving" | "saved" | "disconnected";

const POLL_MS = 1_500;

function toBase64(bytes: Uint8Array): string {
  if (typeof window === "undefined") return "";
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function useTenantDocCollaboration(input: {
  pageId: string;
  clientId: string;
  displayName: string;
  canEdit: boolean;
  enabled: boolean;
  getContentJson?: () => unknown;
}) {
  const ydoc = useMemo(() => new Y.Doc(), []);
  const [presences, setPresences] = useState<CollaborationPresence[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [revision, setRevision] = useState<string>("0");
  const dirtyRef = useRef(false);
  const syncingRef = useRef(false);

  const pushLocalUpdate = useCallback(() => {
    if (!input.enabled || !input.canEdit) return;
    dirtyRef.current = true;
    setSaveStatus("saving");
  }, [input.canEdit, input.enabled]);

  const sync = useCallback(
    async (markDisconnected?: boolean) => {
      if (!input.enabled) return;
      if (syncingRef.current) return;
      syncingRef.current = true;

      try {
        const update =
          dirtyRef.current && input.canEdit
            ? toBase64(Y.encodeStateAsUpdate(ydoc))
            : undefined;
        const stateVector = toBase64(Y.encodeStateVector(ydoc));

        const response = await fetch(
          `/api/tenant-documentation/pages/${input.pageId}/collaboration`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: input.clientId,
              displayName: input.displayName,
              updateBase64: update,
              stateVectorBase64: stateVector,
              contentJson: dirtyRef.current ? input.getContentJson?.() : undefined,
              markDisconnected: markDisconnected === true,
            }),
          },
        );

        if (!response.ok) {
          setSaveStatus("disconnected");
          return;
        }

        const payload = (await response.json()) as {
          updateBase64: string;
          presences: CollaborationPresence[];
          revision: string;
          saveStatus: string;
        };

        if (payload.updateBase64) {
          applyYjsUpdateToDoc(ydoc, payload.updateBase64);
        }

        setPresences(payload.presences);
        setRevision(payload.revision);
        dirtyRef.current = false;
        setSaveStatus(
          markDisconnected || payload.saveStatus === "DISCONNECTED"
            ? "disconnected"
            : "saved",
        );
      } finally {
        syncingRef.current = false;
      }
    },
    [
      input.canEdit,
      input.clientId,
      input.displayName,
      input.enabled,
      input.getContentJson,
      input.pageId,
      ydoc,
    ],
  );

  useEffect(() => {
    if (!input.enabled) return undefined;
    void sync();

    const onUpdate = () => pushLocalUpdate();
    ydoc.on("update", onUpdate);

    const timer = window.setInterval(() => {
      if (dirtyRef.current || saveStatus === "saving") {
        void sync();
      } else {
        void sync();
      }
    }, POLL_MS);

  const disconnect = () => {
      void sync(true);
    };
    window.addEventListener("beforeunload", disconnect);

    return () => {
      ydoc.off("update", onUpdate);
      window.clearInterval(timer);
      window.removeEventListener("beforeunload", disconnect);
      void sync(true);
    };
  }, [input.enabled, pushLocalUpdate, saveStatus, sync, ydoc]);

  return {
    ydoc,
    fragmentName: TENANT_DOC_YJS_FRAGMENT,
    presences,
    saveStatus,
    revision,
    markDirty: pushLocalUpdate,
  };
}