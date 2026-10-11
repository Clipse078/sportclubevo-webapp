import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { SCE_WORKSPACE_FEATURE_CARD_CLASS } from "@/lib/sce/workspace/sce-workspace-layout";
import { SceSectionHeader } from "./SceSectionHeader";

type Props = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  testId?: string;
  headingId?: string;
};

/**
 * SCE-UI-STANDARD-01 — functional card (Communication hub capability pattern).
 */
export function SceFeatureCard({
  title,
  description,
  icon,
  children,
  className,
  testId,
  headingId,
}: Props) {
  return (
    <section
      className={cn(SCE_WORKSPACE_FEATURE_CARD_CLASS, className)}
      data-testid={testId}
      aria-labelledby={headingId ?? (testId ? `${testId}-heading` : undefined)}
    >
      <SceSectionHeader
        id={headingId ?? (testId ? `${testId}-heading` : undefined)}
        title={title}
        description={description}
        icon={icon}
      />
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}
