"use client";

/**
 * Unified operational toolbar for /dashboard/competitions (DS-10 R1 Batch 01).
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { SceSearchField } from "@/components/sce/forms/SceSearchField";
import { SwitchToggle } from "@/components/ui/SwitchToggle";
import { SceDenseToolbar } from "@/components/sce/dense";
import CompetitionsSyncButton from "./CompetitionsSyncButton";
import CompetitionsCreateButton from "./CompetitionsCreateButton";

type Props = {
  initialSearch?: string;
  initialProvider?: string;
  initialIncludeArchived?: boolean;
  canManage?: boolean;
};

export default function CompetitionsOperationalToolbar({
  initialSearch = "",
  initialProvider = "",
  initialIncludeArchived = false,
  canManage = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [includeArchived, setIncludeArchived] = useState(initialIncludeArchived);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <SceDenseToolbar data-testid="competitions-operational-toolbar">
      <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center">
        <SceSearchField
          value={search}
          onChange={(next) => {
            setSearch(next);
            updateParams({ search: next || undefined });
          }}
          placeholder="Wettkampf suchen…"
          ariaLabel="Wettkampf suchen"
          testId="competitions-search"
          shellClassName="min-w-[200px] flex-1 xl:max-w-sm"
        />

        <select
          defaultValue={initialProvider}
          onChange={(e) => updateParams({ provider: e.target.value || undefined })}
          className="fca-select rounded-md py-2 text-sm"
          aria-label="Provider filtern"
          data-testid="competitions-provider-filter"
        >
          <option value="">Alle Provider</option>
          <option value="SFV">SFV</option>
          <option value="MANUAL">Manuell</option>
        </select>

        <SwitchToggle
          id="competitions-include-archived"
          label="Archivierte anzeigen"
          checked={includeArchived}
          onChange={(checked) => {
            setIncludeArchived(checked);
            updateParams({ includeArchived: checked ? "true" : undefined });
          }}
        />

        {canManage ? (
          <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
            <CompetitionsSyncButton />
            <CompetitionsCreateButton />
          </div>
        ) : null}
      </div>
    </SceDenseToolbar>
  );
}
