"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CenterWorkspaceSearchInput } from "@/components/centers/CenterWorkspaceSearchInput";
import SpieleManagementViewSwitcher from "./SpieleManagementViewSwitcher";
import type { SpieleListView } from "@/lib/matchcenter/navigation";

type Props = {
  searchValue?: string;
  listView: SpieleListView;
  listeHref: string;
  kompaktHref: string;
  kalenderHref: string;
};

function SpieleManagementToolbarInner({
  searchValue = "",
  listView,
  listeHref,
  kompaktHref,
  kalenderHref,
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

  const pushSearch = useCallback(
    (nextSearch: string) => {
      const next = new URLSearchParams(searchParams.toString());
      const trimmed = nextSearch.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchDraft === searchValue) return;
    debounceRef.current = setTimeout(() => pushSearch(searchDraft), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchDraft, searchValue, pushSearch]);

  return (
    <div className="space-y-2.5" data-testid="spiele-management-toolbar">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <CenterWorkspaceSearchInput
          value={searchDraft}
          onChange={setSearchDraft}
          placeholder="Spiele durchsuchen …"
          ariaLabel="Spiele durchsuchen"
          className="relative min-w-0 flex-1"
          data-testid="spiele-search-input"
        />
        <SpieleManagementViewSwitcher
          listView={listView}
          listeHref={listeHref}
          kompaktHref={kompaktHref}
          kalenderHref={kalenderHref}
        />
      </div>
    </div>
  );
}

export default function SpieleManagementToolbar(props: Props) {
  return (
    <Suspense fallback={null}>
      <SpieleManagementToolbarInner {...props} />
    </Suspense>
  );
}
