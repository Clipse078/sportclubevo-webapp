"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Pencil } from "lucide-react";

import { TenantDocumentationArchivRestoreButton } from "@/components/admin/tenant-documentation/TenantDocumentationArchivRestoreButton";
import { TenantDocumentationPageActionsMenu } from "@/components/admin/tenant-documentation/TenantDocumentationPageActionsMenu";
import { TenantDocumentationVersionHistoryButton } from "@/components/admin/tenant-documentation/TenantDocumentationVersionHistoryButton";
import { TENANT_DOCUMENTATION_PAPIERKORB_PATH } from "@/lib/tenant-documentation/sce-tenant-documentation-handoff";
import { TENANT_DOCUMENTATION_READ_CONTENT_CLASS } from "@/components/admin/tenant-documentation/tenant-documentation-content-styles";
import {
  TENANT_DOCUMENTATION_MAIN_CANVAS_CLASS,
  TENANT_DOCUMENTATION_SIDEBAR_CLASS,
  TENANT_DOCUMENTATION_WORKSPACE_ROOT_CLASS,
} from "@/lib/tenant-documentation/tenant-documentation-visual-styles";
import type { RichTextValue } from "@/lib/cms/rich-text";
import type { TenantDocumentationPageLifecycleState } from "@/lib/tenant-documentation/page-lifecycle";

const TenantDocumentationEditPanel = dynamic(
  () =>
    import("@/components/admin/tenant-documentation/TenantDocumentationEditPanel").then(
      (mod) => mod.TenantDocumentationEditPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[320px] rounded-lg border border-[var(--border)] bg-white px-6 py-4 text-sm text-[var(--muted)]">
        Editor wird geladen…
      </div>
    ),
  },
);

export type PageTreeNode = {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  children: PageTreeNode[];
  canView: boolean;
};

type SearchHit = {
  pageId: string;
  title: string;
  snippet: string;
};

type Props = {
  pageId: string;
  spaceId: string;
  pageTitle: string;
  spaceTitle: string;
  breadcrumb: string[];
  publishedHtml: string | null;
  publishedMeta: string | null;
  canEdit: boolean;
  canPublish: boolean;
  canCreatePages: boolean;
  canManage: boolean;
  displayName: string;
  publishedContent: RichTextValue | null;
  lifecycleState: TenantDocumentationPageLifecycleState;
  visibilitySummary: {
    inheritedLabel: string;
    effectiveLabel: string;
    hasExplicit: boolean;
  };
  versionView?: {
    versionId: string;
    versionNumber: number;
    isCurrent: boolean;
  } | null;
};

function TreeNodes({
  nodes,
  activePageId,
  depth = 0,
  canCreatePages,
  onCreateChild,
}: {
  nodes: PageTreeNode[];
  activePageId: string;
  depth?: number;
  canCreatePages: boolean;
  onCreateChild: (parentId: string) => void;
}) {
  return (
    <ul className={depth > 0 ? "ml-3 border-l border-[var(--border)] pl-2" : ""}>
      {nodes.map((node) => (
        <li key={node.id} className="py-0.5">
          <div className="flex items-center gap-1">
            <Link
              href={`/dashboard/dokumentation/p/${node.id}`}
              className={`block flex-1 rounded px-2 py-1 text-sm ${
                node.id === activePageId
                  ? "bg-orange-50 font-medium text-orange-800"
                  : "text-[var(--sce-color-text-secondary)] hover:bg-[var(--sce-color-surface-hover)]"
              }`}
            >
              {node.title}
            </Link>
            {canCreatePages ? (
              <button
                type="button"
                title="Unterseite erstellen"
                className="rounded px-1 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)]"
                onClick={() => onCreateChild(node.id)}
              >
                +
              </button>
            ) : null}
          </div>
          {node.children.length > 0 ? (
            <TreeNodes
              nodes={node.children}
              activePageId={activePageId}
              depth={depth + 1}
              canCreatePages={canCreatePages}
              onCreateChild={onCreateChild}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function TenantDocumentationWorkspaceClient(props: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [publishing, setPublishing] = useState(false);
  const [tree, setTree] = useState<PageTreeNode[]>([]);
  const [spaceTitle, setSpaceTitle] = useState(props.spaceTitle);
  const [spaceId, setSpaceId] = useState(props.spaceId);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [creating, setCreating] = useState(false);

  const lifecycleBlocksEditing =
    props.lifecycleState === "ARCHIVED" || props.lifecycleState === "TRASHED";
  const readOnlyVersion = Boolean(props.versionView);

  async function loadTree() {
    const spacesRes = await fetch("/api/tenant-documentation/spaces");
    if (!spacesRes.ok) return;
    const spacesPayload = (await spacesRes.json()) as {
      spaces: Array<{ id: string; title: string }>;
    };
    const first = spacesPayload.spaces[0];
    if (!first) return;
    setSpaceTitle(first.title);
    setSpaceId(first.id);
    const treeRes = await fetch(`/api/tenant-documentation/spaces/${first.id}/tree`);
    if (!treeRes.ok) return;
    const treePayload = (await treeRes.json()) as { tree: PageTreeNode[] };
    setTree(treePayload.tree);
  }

  useEffect(() => {
    void loadTree();
  }, [props.pageId]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchHits([]);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/tenant-documentation/search?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : { hits: [] }))
        .then((payload: { hits: SearchHit[] }) => setSearchHits(payload.hits ?? []))
        .catch(() => setSearchHits([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  async function createPage(parentId: string | null) {
    if (!props.canCreatePages || creating) return;
    const title = window.prompt(
      parentId ? "Titel der Unterseite" : "Titel der neuen Seite",
    );
    if (!title?.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/tenant-documentation/spaces/${spaceId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), parentId }),
      });
      const payload = (await res.json()) as { page?: { href: string }; error?: string };
      if (!res.ok || !payload.page?.href) {
        window.alert(payload.error ?? "Seite konnte nicht erstellt werden.");
        return;
      }
      window.location.href = payload.page.href;
    } finally {
      setCreating(false);
    }
  }

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

  function handleLifecycleRedirect(redirectHref: string) {
    router.push(redirectHref);
  }

  return (
    <div
      className={TENANT_DOCUMENTATION_WORKSPACE_ROOT_CLASS}
      data-testid="tenant-documentation-workspace"
    >
      <aside className={TENANT_DOCUMENTATION_SIDEBAR_CLASS}>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--sce-color-text-primary)]">
          Dokumentation
        </div>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Seiten suchen"
          className="mb-2 w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
        />
        {searchHits.length > 0 ? (
          <ul className="mb-3 max-h-40 overflow-y-auto rounded-md border border-[var(--border)] bg-white text-sm">
            {searchHits.map((hit) => (
              <li key={hit.pageId}>
                <Link
                  href={`/dashboard/dokumentation/p/${hit.pageId}`}
                  className="block px-2 py-1.5 hover:bg-[var(--surface-2)]"
                  onClick={() => setSearchQuery("")}
                >
                  <span className="font-medium">{hit.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <label className="mb-1 block text-xs text-[var(--muted)]">Bereich</label>
        <select className="mb-3 w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm">
          <option>{spaceTitle}</option>
        </select>
        {props.canManage ? (
          <>
            <Link
              href="/dashboard/dokumentation/archiv"
              className="mb-1 block rounded-md px-2 py-1.5 text-sm text-[var(--text-2)] hover:bg-white"
            >
              Archiv
            </Link>
            <Link
              href={TENANT_DOCUMENTATION_PAPIERKORB_PATH}
              className="mb-3 block rounded-md px-2 py-1.5 text-sm text-[var(--text-2)] hover:bg-white"
              data-testid="tenant-doc-papierkorb-link"
            >
              Papierkorb
            </Link>
          </>
        ) : null}
        {props.canCreatePages ? (
          <button
            type="button"
            disabled={creating}
            className="mb-3 w-full rounded-md border border-dashed border-[var(--border)] bg-white px-2 py-1.5 text-sm text-[var(--text-2)] hover:bg-[var(--surface-1)]"
            onClick={() => void createPage(null)}
          >
            Seite erstellen
          </button>
        ) : null}
        <TreeNodes
          nodes={tree}
          activePageId={props.pageId}
          canCreatePages={props.canCreatePages}
          onCreateChild={(parentId) => void createPage(parentId)}
        />
      </aside>

      <main className={TENANT_DOCUMENTATION_MAIN_CANVAS_CLASS}>
        <header className="mb-4">
          <nav className="mb-1 text-xs text-[var(--sce-color-text-muted)]">
            {props.breadcrumb.join(" › ")}
          </nav>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1
              className="text-2xl font-semibold tracking-tight text-[var(--sce-color-text-primary)]"
              data-testid="workspace-page-title"
            >
              {props.pageTitle}
              {readOnlyVersion && props.versionView ? (
                <span className="ml-2 text-base font-normal text-[var(--muted)]">
                  (Version {props.versionView.versionNumber})
                </span>
              ) : null}
            </h1>
            {!readOnlyVersion ? (
              <div className="flex flex-wrap items-center gap-2">
                {props.canManage && !lifecycleBlocksEditing ? (
                  <TenantDocumentationPageActionsMenu
                    pageId={props.pageId}
                    pageTitle={props.pageTitle}
                    canManage={props.canManage}
                    onLifecycleAction={handleLifecycleRedirect}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        {props.lifecycleState === "ARCHIVED" ? (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Diese Seite ist archiviert und erscheint nicht in der Seitennavigation.
          </p>
        ) : null}
        {props.lifecycleState === "TRASHED" ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            <p>Diese Seite befindet sich im Papierkorb.</p>
            {props.canManage ? (
              <TenantDocumentationArchivRestoreButton pageId={props.pageId} source="trash" />
            ) : null}
          </div>
        ) : null}

        {mode === "read" ? (
          <>
            {props.publishedMeta ? (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-800">
                  <Check className="h-4 w-4" aria-hidden /> Veröffentlicht
                </span>
                <span className="text-[var(--muted)]">{props.publishedMeta}</span>
              </div>
            ) : (
              <div className="mb-3 text-sm text-[var(--muted)]">Noch nicht veröffentlicht</div>
            )}

            <div className="mb-5 flex flex-wrap items-center gap-2">
              {props.canEdit && !lifecycleBlocksEditing && !readOnlyVersion ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]"
                  onClick={() => setMode("edit")}
                >
                  <Pencil className="h-4 w-4" aria-hidden /> Bearbeiten
                </button>
              ) : null}
              <TenantDocumentationVersionHistoryButton pageId={props.pageId} />
            </div>

            <article
              className={TENANT_DOCUMENTATION_READ_CONTENT_CLASS}
              dangerouslySetInnerHTML={{
                __html: props.publishedHtml ?? "<p><em>Noch kein veröffentlichter Inhalt.</em></p>",
              }}
            />
          </>
        ) : (
          <TenantDocumentationEditPanel
            pageId={props.pageId}
            displayName={props.displayName}
            canEdit={props.canEdit}
            canPublish={props.canPublish}
            publishing={publishing}
            onPublish={() => void publish()}
            onLeaveReadMode={() => setMode("read")}
          />
        )}
      </main>
    </div>
  );
}