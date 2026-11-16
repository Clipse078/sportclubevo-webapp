"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SceActionableError } from "@/components/sce/feedback/SceActionableError";

export type PersonalDashboardSectionRetryProps = {
  title: string;
  description: string;
  testId: string;
};

/**
 * Section-level retry via router.refresh() — no separate client data layer.
 * Prior content may remain visible in other sections while this section retries.
 */
export function PersonalDashboardSectionRetry({
  title,
  description,
  testId,
}: PersonalDashboardSectionRetryProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <SceActionableError
      title={title}
      description={pending ? "Wird erneut geladen …" : description}
      retryLabel={pending ? "Wird geladen …" : "Erneut laden"}
      onRetry={() => {
        if (pending) return;
        startTransition(() => {
          router.refresh();
        });
      }}
      data-testid={testId}
    />
  );
}