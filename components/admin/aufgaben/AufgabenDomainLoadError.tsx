"use client";

import { useRouter } from "next/navigation";
import { SceActionableError } from "@/components/sce/feedback/SceActionableError";
import {
  buildSceActionableErrorPresentation,
  type SceActionableErrorContext,
} from "@/lib/design-system/sce-actionable-error-foundation";

type Props = {
  context: Extract<
    SceActionableErrorContext,
    "AUFGABEN_MANAGEMENT_LOAD" | "AUFGABEN_REQUIREMENTS_LOAD"
  >;
  testId?: string;
};

export default function AufgabenDomainLoadError({ context, testId }: Props) {
  const router = useRouter();
  const copy = buildSceActionableErrorPresentation({ context });

  return (
    <SceActionableError
      title={copy.title}
      description={copy.description}
      retryLabel={copy.retryLabel}
      onRetry={() => router.refresh()}
      data-testid={testId ?? "aufgaben-domain-load-error"}
    />
  );
}
