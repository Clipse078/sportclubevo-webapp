"use client";

import "@/lib/tenant-documentation/tenant-doc-yjs-client";

import { useCallback, useMemo, useRef } from "react";
import { Check, Pencil, Users } from "lucide-react";

import { TenantDocumentationCollabEditor } from "@/components/admin/tenant-documentation/TenantDocumentationCollabEditor";
import { useTenantDocCollaboration } from "@/components/admin/tenant-documentation/useTenantDocCollaboration";

type Props = {
  pageId: string;
  displayName: string;
  canEdit: boolean;
  canPublish: boolean;
  publishing: boolean;
  onPublish: () => void;
  onLeaveReadMode: () => void;
};

export function TenantDocumentationEditPanel(props: Props) {
  const clientId = useMemo(
    () =>
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}`,
    [],
  );
  const contentJsonRef = useRef<unknown>(null);
  const getContentJson = useCallback(() => contentJsonRef.current, []);

  const collaboration = useTenantDocCollaboration({
    pageId: props.pageId,
    clientId,
    displayName: props.displayName,
    canEdit: props.canEdit,
    enabled: props.canEdit,
    getContentJson,
  });

  const onContentJsonChange = useCallback(
    (doc: unknown) => {
      contentJsonRef.current = doc;
      collaboration.markDirty();
    },
    [collaboration],
  );

  const activeEditors = collaboration.presences.filter((p) => !p.disconnected);

  const saveLabel =
    collaboration.saveStatus === "saving"
      ? "Speichert…"
      : collaboration.saveStatus === "disconnected"
        ? "Getrennt"
        : "Alle Änderungen gespeichert";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-white px-4 py-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-sm text-orange-800">
          <Pencil className="h-4 w-4" /> Entwurf
        </span>
        <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
          <Users className="h-4 w-4" />
          <span>
            {activeEditors.length}{" "}
            {activeEditors.length === 1 ? "Person bearbeitet" : "Personen bearbeiten"}
          </span>
          <MotionAvatars presences={activeEditors} />
        </div>
        <span
          className={`text-sm ${
            collaboration.saveStatus === "saved" ? "text-emerald-700" : "text-[var(--muted)]"
          }`}
          data-testid="tenant-doc-save-status"
        >
          {collaboration.saveStatus === "saved" ? (
            <Check className="mr-1 inline h-4 w-4" />
          ) : null}
          {saveLabel}
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
            onClick={props.onLeaveReadMode}
          >
            Lesemodus
          </button>
          {props.canPublish ? (
            <button
              type="button"
              disabled={props.publishing}
              onClick={props.onPublish}
              className="rounded-md bg-orange-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              Veröffentlichen
            </button>
          ) : null}
        </div>
      </div>

      <TenantDocumentationCollabEditor
        ydoc={collaboration.ydoc}
        fragmentName={collaboration.fragmentName}
        presences={collaboration.presences}
        actorDisplayName={props.displayName}
        onContentJsonChange={onContentJsonChange}
      />
    </>
  );
}

function MotionAvatars({
  presences,
}: {
  presences: Array<{ displayName: string; color: string }>;
}) {
  return (
    <span className="inline-flex -space-x-1">
      {presences.slice(0, 4).map((p) => (
        <span
          key={p.displayName}
          title={p.displayName}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white"
          style={{ backgroundColor: p.color }}
        >
          {p.displayName
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join("")}
        </span>
      ))}
    </span>
  );
}