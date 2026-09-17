"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";

type TeamOption = { id: string; label: string };

type Props = {
  teamOptions: TeamOption[];
  searchValue?: string;
  teamValue?: string;
  statusValue?: string;
  archived?: boolean;
};

const CONTROL =
  "h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]";

export default function TrainingManagementToolbar({
  teamOptions,
  searchValue = "",
  teamValue = "",
  statusValue = "",
  archived = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(searchValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchDraft(searchValue);
  }, [searchValue]);

  const pushFilters = useCallback(
    (patch: { search?: string; team?: string; status?: string }) => {
      const next = new URLSearchParams(searchParams.toString());
      if (archived) next.set("archived", "1");
      else next.delete("archived");

      const search = patch.search ?? searchDraft;
      const team = patch.team ?? teamValue;
      const status = patch.status ?? statusValue;

      if (search.trim()) next.set("seriesSearch", search.trim());
      else next.delete("seriesSearch");

      if (team) next.set("seriesTeam", team);
      else next.delete("seriesTeam");

      if (status) next.set("seriesStatus", status);
      else next.delete("seriesStatus");

      next.delete("sessionSearch");
      next.delete("sessionTeam");
      next.delete("sessionStatus");
      next.delete("sessionsPage");
      next.delete("page");

      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [archived, pathname, router, searchDraft, searchParams, startTransition, statusValue, teamValue],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchDraft === searchValue) return;

    debounceRef.current = setTimeout(() => {
      pushFilters({ search: searchDraft });
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchDraft, searchValue, pushFilters]);

  return (
    <div
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
      data-testid="training-management-toolbar"
    >
      <label className="relative min-w-[12rem] flex-1">
        <span className="sr-only">Trainings durchsuchen</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Trainings durchsuchen..."
          className={cn(CONTROL, "w-full pl-9 pr-3")}
          data-testid="training-search-input"
        />
      </label>

      <label className="min-w-[9rem] sm:w-auto">
        <span className="sr-only">Team filtern</span>
        <select
          value={teamValue}
          onChange={(event) => pushFilters({ team: event.target.value })}
          className={cn(CONTROL, "w-full min-w-[9rem] px-3")}
          data-testid="training-team-filter"
        >
          <option value="">Alle Teams</option>
          {teamOptions.map((team) => (
            <option key={team.id} value={team.id}>
              {team.label}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-[9rem] sm:w-auto">
        <span className="sr-only">Status filtern</span>
        <select
          value={statusValue}
          onChange={(event) => pushFilters({ status: event.target.value })}
          className={cn(CONTROL, "w-full min-w-[9rem] px-3")}
          data-testid="training-status-filter"
        >
          <option value="">Status</option>
          <option value="ALL">Alle Status</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="INACTIVE">Inaktiv</option>
          <option value="ARCHIVED">Archiviert</option>
        </select>
      </label>
    </div>
  );
}
