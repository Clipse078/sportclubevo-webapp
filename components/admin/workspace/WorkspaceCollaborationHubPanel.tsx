"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  formatWorkspaceDateTime,
} from "./workspace-document-formatters";
import type { CollaborationListItem } from "./useWorkspaceCollaboration";

type Props = {
  mode: "favorites" | "recent";
  items: CollaborationListItem[];
  loading: boolean;
  error: string | null;
};

function hrefFor(item: CollaborationListItem): string {
  if (item.resourceType === "FOLDER") {
    return `/dashboard/workspace?folder=${encodeURIComponent(item.resourceId)}`;
  }
  return `/dashboard/workspace?document=${encodeURIComponent(item.resourceId)}`;
}

function lifecycleLabel(
  labels: { archived: string; trashed: string },
  lifecycle: string,
): string | null {
  if (lifecycle === "ACTIVE") return null;
  if (lifecycle === "ARCHIVED") return labels.archived;
  if (lifecycle === "TRASHED") return labels.trashed;
  return lifecycle;
}

export function WorkspaceCollaborationHubPanel({ mode, items, loading, error }: Props) {
  const t = useTranslations("Workspace.discovery");

  if (loading) {
    return (
      <section
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-8"
        aria-busy="true"
        data-testid={`workspace-hub-${mode}-loading`}
      >
        <p className="text-sm text-[var(--text-2)]">{t("loading")}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-8"
        role="alert"
        data-testid={`workspace-hub-${mode}-error`}
      >
        <p className="text-sm text-[var(--sce-danger)]">{t("loadError")}</p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section
        className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center"
        data-testid={`workspace-hub-${mode}-empty`}
      >
        <h2 className="text-base font-semibold text-[var(--text)]">
          {mode === "favorites" ? t("favoritesEmptyTitle") : t("recentEmptyTitle")}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-2)]">
          {mode === "favorites" ? t("favoritesEmptyDescription") : t("recentEmptyDescription")}
        </p>
      </section>
    );
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
      data-testid={`workspace-hub-${mode}-list`}
    >
      <header className="border-b border-[var(--border)] px-5 py-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          {mode === "favorites" ? t("favoritesTab") : t("recentTab")}
        </h2>
        <p className="mt-0.5 text-xs text-[var(--text-2)]">
          {mode === "favorites" ? t("favoritesListHint") : t("recentListHint")}
        </p>
      </header>
      <ul className="divide-y divide-[var(--border)]">
        {items.map((item) => {
          const lifecycle = lifecycleLabel(
            { archived: t("lifecycleArchived"), trashed: t("lifecycleTrashed") },
            item.lifecycle,
          );
          const meta =
            mode === "recent" && item.accessedAt
              ? formatWorkspaceDateTime(item.accessedAt)
              : item.parentFolderName;
          return (
            <li key={`${item.resourceType}:${item.resourceId}:${item.accessedAt ?? item.createdAt ?? ""}`}>
              <Link
                href={hrefFor(item)}
                className="flex min-w-0 items-start justify-between gap-3 px-5 py-3 transition hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sce-primary)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text)]" title={item.name}>
                    {item.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                    {item.resourceType === "FOLDER" ? t("folderLabel") : t("documentLabel")}
                    {meta ? ` · ${meta}` : null}
                  </p>
                </div>
                {lifecycle ? (
                  <span className="shrink-0 rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-2)]">
                    {lifecycle}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
