"use client";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Dialog } from "@/components/ui/Dialog";
import { DashboardHeroSection } from "./DashboardHeroSection";
import type { HeroImageTransform } from "@/lib/dashboard/dashboard-hero-position";

type PersonalDashboardCustomizeDialogProps = {
  greeting: string;
  highlightName?: string;
  initialBackgroundImageUrl?: string | null;
  initialBackgroundTransform?: HeroImageTransform;
  className?: string;
};

/**
 * Compact dashboard customization entry (hero image preferences) — not rendered on the main canvas.
 */
export function PersonalDashboardCustomizeDialog({
  greeting,
  highlightName,
  initialBackgroundImageUrl = null,
  initialBackgroundTransform,
  className,
}: PersonalDashboardCustomizeDialogProps) {
  const t = useTranslations("PersonalDashboard.welcome");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-[2rem] items-center gap-1.5 rounded-[var(--radius-md)] px-2 py-1",
          "text-[0.8125rem] font-medium text-[var(--text-2)]",
          "motion-safe:transition-colors motion-safe:hover:text-[var(--foreground)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          className,
        )}
        data-testid="personal-dashboard-customize-trigger"
      >
        <ProductDomainSceIcon name="settings" size={12} className="h-3.5 w-3.5 shrink-0" />
        {t("customize")}
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("customizeTitle")}
        description={t("customizeDescription")}
        size="lg"
      >
        <div className="max-h-[min(70vh,32rem)] overflow-auto rounded-[var(--radius-lg)] border border-[var(--border)]">
          <DashboardHeroSection
            greeting={greeting}
            highlightName={highlightName}
            initialBackgroundImageUrl={initialBackgroundImageUrl}
            initialBackgroundTransform={initialBackgroundTransform}
          />
        </div>
      </Dialog>
    </>
  );
}
