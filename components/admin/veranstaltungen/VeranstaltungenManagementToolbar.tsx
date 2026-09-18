"use client";

import { Suspense, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CenterWorkspaceSearchInput } from "@/components/centers/CenterWorkspaceSearchInput";

type Props = {
  searchValue?: string;
};

function Inner({ searchValue = "" }: Props) {
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
    <div className="space-y-2.5" data-testid="veranstaltungen-toolbar">
      <CenterWorkspaceSearchInput
        value={searchDraft}
        onChange={setSearchDraft}
        placeholder="Veranstaltungen durchsuchen …"
        ariaLabel="Veranstaltungen durchsuchen"
        className="relative min-w-0 flex-1"
        data-testid="veranstaltungen-search"
      />
    </div>
  );
}

export default function VeranstaltungenManagementToolbar(props: Props) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
