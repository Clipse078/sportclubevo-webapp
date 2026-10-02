"use client";

import Link from "next/link";
import type { SportingActivityDetail } from "@/lib/sporting-activity-detail/types";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { SportingActivityDetailContent } from "./SportingActivityDetailContent";

export function SportingActivityDetailPageView({
  detail,
  fmtCfg,
  backHref,
}: {
  detail: SportingActivityDetail;
  fmtCfg: TenantFormatConfig;
  backHref: string;
}) {
  return (
    <div
      className="mx-auto w-full max-w-2xl"
      data-testid="sporting-activity-detail-page"
    >
      <div className="mb-4">
        <Link href={backHref} className="sce-link-primary text-[0.875rem] font-medium">
          ← Zurück
        </Link>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
        <SportingActivityDetailContent detail={detail} fmtCfg={fmtCfg} layout="page" />
      </div>
    </div>
  );
}
