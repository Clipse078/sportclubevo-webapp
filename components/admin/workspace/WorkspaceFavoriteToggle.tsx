"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { useOptionalWorkspaceFavoritesContext } from "./WorkspaceCollaborationProvider";

type WorkspaceFavoriteToggleProps = {
  resourceType: "FOLDER" | "DOCUMENT";
  resourceId: string;
  /** Compact icon-only for rows; default false adds visible label in menus. */
  iconOnly?: boolean;
  className?: string;
};

export function WorkspaceFavoriteToggle({
  resourceType,
  resourceId,
  iconOnly = true,
  className = "",
}: WorkspaceFavoriteToggleProps) {
  const t = useTranslations("Workspace.favorites");
  const favorites = useOptionalWorkspaceFavoritesContext();
  if (!favorites) return null;
  const { isFavorite, isPending, toggleFavorite } = favorites;
  const favorited = isFavorite(resourceType, resourceId);
  const pending = isPending(resourceType, resourceId);
  const label = favorited ? t("remove") : t("add");

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={favorited}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        void toggleFavorite(resourceType, resourceId);
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] disabled:opacity-50 ${
        iconOnly
          ? "h-8 w-8 justify-center text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          : "px-2 py-1.5 text-[var(--text-2)] hover:bg-[var(--surface-2)]"
      } ${favorited ? "text-amber-500 hover:text-amber-600" : ""} ${className}`}
      data-testid="workspace-favorite-toggle"
    >
      <Star
        className={`h-4 w-4 ${favorited ? "fill-current" : ""}`}
        aria-hidden="true"
      />
      {!iconOnly ? <span>{label}</span> : null}
    </button>
  );
}
