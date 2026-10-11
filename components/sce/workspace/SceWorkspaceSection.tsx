import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { SCE_WORKSPACE_SECTION_PADDING_CLASS } from "@/lib/sce/workspace/sce-workspace-layout";
import { SceSectionHeader } from "./SceSectionHeader";

type Props = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  testId?: string;
  id?: string;
};

/** SCE-UI-STANDARD-01 — section inside a shared surface (divide-y stacks). */
export function SceWorkspaceSection({
  title,
  description,
  icon,
  children,
  className,
  testId,
  id,
}: Props) {
  return (
    <section
      id={id}
      className={cn(SCE_WORKSPACE_SECTION_PADDING_CLASS, className)}
      data-testid={testId}
    >
      <SceSectionHeader title={title} description={description} icon={icon} className="mb-3" />
      {children}
    </section>
  );
}
