"use client";

import { useRouter } from "next/navigation";
import type { RequirementManagementQueryState } from "@/lib/requirements/management-navigation";
import { buildRequirementManagementHref } from "@/lib/requirements/management-navigation";
import { REQUIREMENT_MANAGEMENT_SORT_LABELS } from "@/lib/requirements/management-navigation";

type Props = {
  query: RequirementManagementQueryState;
  basePath: string;
};

export default function RequirementsManagementFilters({ query, basePath }: Props) {
  const router = useRouter();

  function navigate(patch: Partial<RequirementManagementQueryState>) {
    router.push(buildRequirementManagementHref(basePath, query, { ...patch, page: 1 }));
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-[var(--border)]/80 bg-[var(--surface)]/40 p-3 sm:flex-row sm:flex-wrap sm:items-end"
      data-testid="requirements-management-filters"
    >
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-[var(--text-2)]">
        Suche
        <input
          type="search"
          defaultValue={query.search}
          placeholder="Titel…"
          className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
          data-testid="requirements-filter-search"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              navigate({ search: (e.target as HTMLInputElement).value.trim() });
            }
          }}
          onBlur={(e) => {
            const value = e.target.value.trim();
            if (value !== query.search) navigate({ search: value });
          }}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-[var(--text-2)]">
        Status
        <select
          className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
          value={query.status}
          data-testid="requirements-filter-status"
          onChange={(e) => navigate({ status: e.target.value as RequirementManagementQueryState["status"] })}
        >
          <option value="ALL">Alle</option>
          <option value="DRAFT">Entwurf</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="CLOSED">Abgeschlossen</option>
          <option value="CANCELLED">Abgebrochen</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-[var(--text-2)]">
        Fälligkeit
        <select
          className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
          value={query.deadline}
          data-testid="requirements-filter-deadline"
          onChange={(e) =>
            navigate({ deadline: e.target.value as RequirementManagementQueryState["deadline"] })
          }
        >
          <option value="ALL">Alle</option>
          <option value="OVERDUE">Überfällig</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-[var(--text-2)]">
        Sortierung
        <select
          className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
          value={query.sort}
          data-testid="requirements-filter-sort"
          onChange={(e) => navigate({ sort: e.target.value as RequirementManagementQueryState["sort"] })}
        >
          {Object.entries(REQUIREMENT_MANAGEMENT_SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
