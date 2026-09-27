import type { ReactNode } from "react";
import { SCE_DASHBOARD_MODULE_PAGE_SURFACE } from "@/lib/shell/sce-surface-system";

type CommunicationInboxLayoutProps = {
  children: ReactNode;
};

/** Shared Kommunikationscenter surface for inbox + settings (SCE-COMM-15-UX-01). */
export default function CommunicationInboxLayout({
  children,
}: CommunicationInboxLayoutProps) {
  return <div className={SCE_DASHBOARD_MODULE_PAGE_SURFACE}>{children}</div>;
}
