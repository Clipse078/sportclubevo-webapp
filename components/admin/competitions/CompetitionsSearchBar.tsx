"use client";

/**
 * CompetitionsSearchBar
 *
 * Client-side search and filter bar for the Competitions overview page.
 * Updates URL search params on change (no form submit required).
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { SceSearchField } from "@/components/sce/forms/SceSearchField";
import { SwitchToggle } from "@/components/ui/SwitchToggle";

type Props = {
  initialSearch?: string;
  initialProvider?: string;
  initialIncludeArchived?: boolean;
};

export default function CompetitionsSearchBar({
  initialSearch = "",
  initialProvider = "",
  initialIncludeArchived = false,
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
    <div className="flex flex-wrap items-center gap-3">
      <SceSearchField
        value={search}
        onChange={(next) => {
          setSearch(next);
          updateParams({ search: next || undefined });
        }}
        placeholder="Wettkampf suchen…"
        ariaLabel="Wettkampf suchen"
        testId="competitions-search"
        shellClassName="min-w-[200px]"
      />

      <select
        defaultValue={initialProvider}
        onChange={(e) => updateParams({ provider: e.target.value || undefined })}
        className="fca-select rounded-md py-2 text-sm"
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
    </div>
  );
}
