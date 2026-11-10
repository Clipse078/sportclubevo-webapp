import type { ReactNode } from "react";
import { SCE_DASHBOARD_MODULE_PAGE_SURFACE } from "@/lib/shell/sce-surface-system";

type WebsiteModuleLayoutProps = {
  children: ReactNode;
};

/** Shared Website CMS module canvas (DS2-07D). */
export default function WebsiteModuleLayout({ children }: WebsiteModuleLayoutProps) {
  return <div className={SCE_DASHBOARD_MODULE_PAGE_SURFACE}>{children}</div>;
}
