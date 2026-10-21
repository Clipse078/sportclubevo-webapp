import type { ReactNode } from "react";
import { SceWorkspaceHeader } from "@/components/sce/workspace/SceWorkspaceHeader";

/**
 * AdminSectionHeader — DS-10 bridge to canonical `SceWorkspaceHeader`.
 *
 * Internal WebApp headers must use the Premium SaaS typography standard.
 * Do not use tenant branding, football typography, or legacy fca-heading styles here.
 */
type AdminSectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export default function AdminSectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: AdminSectionHeaderProps) {
  return (
    <SceWorkspaceHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      secondaryActions={actions}
    />
  );
}
