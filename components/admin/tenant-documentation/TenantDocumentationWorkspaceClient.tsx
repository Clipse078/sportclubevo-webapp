"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clock,
  Pencil,
  Users,
} from "lucide-react";

import { TenantDocumentationCollabEditor } from "@/components/admin/tenant-documentation/TenantDocumentationCollabEditor";
import { useTenantDocCollaboration } from "@/components/admin/tenant-documentation/useTenantDocCollaboration";
import { richTextToHtml } from "@/lib/cms/rich-text";
import type { RichTextValue } from "@/lib/cms/rich-text";

export type PageTreeNode = {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  children: PageTreeNode[];
  canView: boolean;
};

type Props = {
  pageId: string;
  pageTitle: string;
  spaceTitle: string;
  breadcrumb: string[];
  publishedHtml: string | null;
  publishedMeta: string | null;
  canEdit: boolean;
  canPublish: boolean;
  displayName: string;
  publishedContent: RichTextValue | null;
};

function TreeNodes({
  nodes,
  activePageId,
  depth = 0,
}: {
  nodes: PageTreeNode[];
  activePageId: string;
  depth?: number;
}) {
  return (
    <ul className={depth > 0 ? "ml-3 border-l border-[var(--border)] pl-2" : ""}>
      {nodes.map((node) => (
        <li key={node.id} className="py-0.5">
          <Link
            href={`/dashboard/dokumentation/p/${node.id}`}
            className={`block rounded px-2 py-1 text-sm ${
              node.id === activePageId
                ? "bg-orange-50 font-medium text-orange-800"
                : "text-[var(--text-2)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {node.title}
          </Link>
          {node.children.length > 0 ? (
            <TreeNodes nodes={node.children} activePageId={activePageId} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function TenantDocumentationWorkspaceClient(props: Props) {
  const clientId = useMemo(
    () =>
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}`,
    [],
  );
  const [mode, setMode] = useState<"read" | "edit">(
    props.canEdit ? "edit" : "read",
  );
  const [publishing, setPublishing] = useState(false);
  const [tree, setTree] = useState<PageTreeNode[]>([]);
  const [spaceTitle, setSpaceTitle] = useState(props.spaceTitle);
  const [searchQuery, setSearchQuery] = useState("");
  const contentJsonRef = useRef<unknown>(null);

  const getContentJson = useCallback(() => contentJsonRef.current, []);

  const collaboration = useTenantDocCollaboration({
    pageId: props.pageId,
    clientId,
    displayName: props.displayName,
    canEdit: props.canEdit && mode === "edit",
    enabled: mode === "edit" && props.canEdit,
    getContentJson,
  });

  const onContentJsonChange = useCallback((doc: unknown) => {
    contentJsonRef.current = doc;
    collaboration.markDirty();
  }, [collaboration]);

  const activeEditors = collaboration.presences.filter((p) => !p.disconnected);

  async function loadTree() {
    const spacesRes = await fetch("/api/tenant-documentation/spaces");
    if (!spacesRes.ok) return;
    const spacesPayload = (await spacesRes.json()) as {
      spaces: Array<{ id: string; title: string }>;
    };
    const first = spacesPayload.spaces[0];
    if (!first) return;
    setSpaceTitle(first.title);
    const treeRes = await fetch(`/api/tenant-documentation/spaces/${first.id}/tree`);
    if (!treeRes.ok) return;
    const treePayload = (await treeRes.json()) as { tree: PageTreeNode[] };
    setTree(treePayload.tree);
  }

  useEffect(() => {
    void loadTree();
  }, [props.pageId]);

  async function publish() {
    setPublishing(true);
    try {
      await fetch(`/api/tenant-documentation/pages/${props.pageId}/publish`, {
        method: "POST",
      });
      window.location.reload();
    } finally {
      setPublishing(false);
    }
  }

  const saveLabel =
    collaboration.saveStatus === "saving"
      ? "Speichert…"
      : collaboration.saveStatus === "disconnected"
        ? "Getrennt"
        : "Alle Änderungen gespeichert";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[var(--surface-1)]">
      <aside className="w-72 shrink-0 border-r border-[var(--border)] bg-[var(--surface-2)] p-4">
        <div className="mb-3 text-sm font-semibold text-[var(--foreground)]">Dokumentation</div>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Seiten suchen"
          className="mb-3 w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
        />
        <label className="mb-1 block text-xs text-[var(--muted)]">Bereich</label>
        <select className="mb-4 w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm">
          <option>{spaceTitle}</option>
        </select>
        <TreeNodes nodes={tree} activePageId={props.pageId} />
      </aside>

      <main className="flex-1 p-6">
        <nav className="mb-2 text-xs text-[var(--muted)]">{props.breadcrumb.join(" > ")}</nav>
        <h1 className="mb-4 text-2xl font-semibold text-[var(--foreground)]">{props.pageTitle}</h1>

        {mode === "read" ? (
          <>
            {props.publishedMeta ? (
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-800">
                  <Check className="h-4 w-4" /> Veröffentlicht
                </span>
                <span className="text-[var(--muted)]">{props.publishedMeta}</span>
              </div>
            ) : (
              <div className="mb-4 text-sm text-[var(--muted)]">Noch nicht veröffentlicht</div>
            )}

            <div className="mb-4 flex gap-2">
              {props.canEdit ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
                  onClick={() => setMode("edit")}
                >
                  <Pencil className="h-4 w-4" /> Bearbeiten
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
              >
                <Clock className="h-4 w-4" /> Versionsverlauf
              </button>
            </div>

            <article
              className="prose prose-sm max-w-none rounded-lg border border-[var(--border)] bg-white px-6 py-4"
              dangerouslySetInnerHTML={{
                __html: props.publishedHtml ?? "<p><em>Noch kein veröffentlichter Inhalt.</em></p>",
              }}
            />
          </>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-white px-4 py-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-sm text-orange-800">
                <Pencil className="h-4 w-4" /> Entwurf
              </span>
              <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                <Users className="h-4 w-4" />
                <span>
                  {activeEditors.length} {activeEditors.length === 1 ? "Person bearbeitet" : "Personen bearbeiten"}
                </span>
                <MotionAvatars presences={activeEditors} />
              </div>
              <span
                className={`text-sm ${
                  collaboration.saveStatus === "saved" ? "text-emerald-700" : "text-[var(--muted)]"
                }`}
              >
                {collaboration.saveStatus === "saved" ? <Check className="mr-1 inline h-4 w-4" /> : null}
                {saveLabel}
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
                  onClick={() => setMode("read")}
                >
                  Lesemodus
                </button>
                {props.canPublish ? (
                  <button
                    type="button"
                    disabled={publishing}
                    onClick={() => void publish()}
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
        )}
      </main>
    </div>
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