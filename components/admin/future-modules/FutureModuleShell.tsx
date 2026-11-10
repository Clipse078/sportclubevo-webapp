import type { LucideIcon } from "lucide-react";
import type { SceIconRegistryName } from "@/components/design-system/icons/registry";
import { FutureModulePageContent } from "@/components/admin/future-modules/FutureModulePageContent";
import { Badge } from "@/components/ui/Badge";
import { PageShell, type BreadcrumbItem } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

export type FutureModuleCapability = {
  title: string;
  description: string;
  sceIcon?: SceIconRegistryName;
  icon?: LucideIcon;
};

type FutureModuleShellProps = {
  title: string;
  purpose: string;
  sceIcon?: SceIconRegistryName;
  icon?: LucideIcon;
  capabilities: FutureModuleCapability[];
  breadcrumbs: BreadcrumbItem[];
  footerNote?: string;
  supplementaryContent?: React.ReactNode;
};

export function FutureModuleShell({
  title,
  purpose,
  sceIcon,
  icon: LegacyModuleIcon,
  capabilities,
  breadcrumbs,
  footerNote,
  supplementaryContent,
}: FutureModuleShellProps) {
  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow={title}
        title={title}
        description={purpose}
        breadcrumbs={breadcrumbs}
        headerBadge={<Badge variant="warning">In Vorbereitung</Badge>}
      >
        <FutureModulePageContent
          sceIcon={sceIcon}
          icon={LegacyModuleIcon}
          capabilities={capabilities}
          footerNote={footerNote}
          supplementaryContent={supplementaryContent}
        />
      </ListPagePattern>
    </PageShell>
  );
}
