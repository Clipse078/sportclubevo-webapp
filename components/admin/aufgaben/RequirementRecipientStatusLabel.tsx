"use client";

import type { RequirementRecipientManagementStatus } from "@/lib/requirements/recipient-progress-presentation";
import { requirementRecipientStatusPresentation } from "@/lib/requirements/recipient-progress-presentation";
import { cn } from "@/lib/cn";

type Props = {
  status: RequirementRecipientManagementStatus;
  className?: string;
};

export default function RequirementRecipientStatusLabel({ status, className }: Props) {
  const presentation = requirementRecipientStatusPresentation(status);
  const Icon = presentation.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", presentation.iconClassName)} aria-hidden="true" />
      <span className={presentation.textClassName}>{presentation.label}</span>
    </span>
  );
}
