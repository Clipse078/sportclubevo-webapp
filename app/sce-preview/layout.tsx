import type { ReactNode } from "react";
import { sceWhiteEditionThemeDataAttributes } from "@/lib/design-system/sce-white-edition-flag";

type ScePreviewLayoutProps = {
  children: ReactNode;
};

/**
 * Preview routes mirror authenticated white-edition tokens when SCE_WHITE_EDITION is on.
 */
export default function ScePreviewLayout({ children }: ScePreviewLayoutProps) {
  const whiteEditionTheme = sceWhiteEditionThemeDataAttributes();

  return (
    <div
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
      {...whiteEditionTheme}
    >
      {children}
    </div>
  );
}
