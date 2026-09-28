import type { ReactNode } from "react";
import { SCE_DASHBOARD_MODULE_PAGE_SURFACE } from "@/lib/shell/sce-surface-system";

type CommunicationModuleLayoutProps = {
  children: ReactNode;
};

/** Shared Kommunikation module canvas (SCE-COMM-UX-01). */
export default function CommunicationModuleLayout({
  children,
}: CommunicationModuleLayoutProps) {
  return <div className={SCE_DASHBOARD_MODULE_PAGE_SURFACE}>{children}</div>;
}
