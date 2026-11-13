import type { ReactNode } from "react";
import { SCE_DS2_WHITE_EDITION } from "@/lib/design-system/sce-foundation-contract";

type Props = {
  children: ReactNode;
};

/**
 * Auth surfaces always render DS2 white-first tokens without depending on
 * the authenticated SCE_WHITE_EDITION feature flag.
 */
export default function AuthLayout({ children }: Props) {
  return (
    <div
      className="sce-theme-white min-h-screen w-full bg-white text-[var(--foreground)]"
      data-sce-theme={SCE_DS2_WHITE_EDITION.themeValue}
    >
      {children}
    </div>
  );
}
