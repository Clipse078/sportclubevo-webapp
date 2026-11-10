import type { ReactNode } from "react";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";

/**
 * DS2-07A — governance chrome for the /teams/new redirect alias.
 * Preserves bookmarks while routing creation through /dashboard/teams/register.
 */
export default function TeamsNewAliasLayout({ children }: { children: ReactNode }) {
  return (
    <PageShell fullWidth>
      <SceWorkspaceChrome>{children}</SceWorkspaceChrome>
    </PageShell>
  );
}
