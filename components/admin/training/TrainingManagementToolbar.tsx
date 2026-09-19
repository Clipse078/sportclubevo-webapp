"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CenterWorkspaceSearchInput } from "@/components/centers/CenterWorkspaceSearchInput";

type Props = {
  searchValue?: string;
  archived?: boolean;
};

export default function TrainingManagementToolbar({
  searchValue = "",
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

  const pushSearch = useCallback(
    (nextSearch: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (archived) next.set("archived", "1");
      else next.delete("archived");

      const trimmed = nextSearch.trim();
      if (trimmed) next.set("seriesSearch", trimmed);
      else next.delete("seriesSearch");

      next.delete("page");

      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [archived, pathname, router, searchParams, startTransition],
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
    <div className="space-y-2.5" data-testid="training-toolbar">
      <CenterWorkspaceSearchInput
        value={searchDraft}
        onChange={setSearchDraft}
        placeholder="Trainings durchsuchen …"
        ariaLabel="Trainings durchsuchen"
        className="relative min-w-0 flex-1"
        data-testid="training-search"
      />
    </div>
  );
}
