"use client";

import Link from "next/link";
import ZielgruppeDuplicateButton from "@/components/admin/communication/zielgruppen/ZielgruppeDuplicateButton";

type Props = {
  targetGroupId: string;
  name: string;
  canManage: boolean;
};

export default function ZielgruppenOverviewRowActions({
  targetGroupId,
  name,
  canManage,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/dashboard/communication/zielgruppen/${targetGroupId}`}
        className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
      >
        Öffnen
      </Link>
      {canManage ? (
        <>
          <Link
            href={`/dashboard/communication/zielgruppen/${targetGroupId}?edit=1`}
            className="text-xs font-medium text-[var(--foreground)] hover:underline"
          >
            Bearbeiten
          </Link>
          <ZielgruppeDuplicateButton
            targetGroupId={targetGroupId}
            sourceName={name}
            canManage
            variant="link"
          />
        </>
      ) : null}
    </div>
  );
}
