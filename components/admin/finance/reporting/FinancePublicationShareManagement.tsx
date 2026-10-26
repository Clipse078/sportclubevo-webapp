"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  listFinancePublicationSharesAction,
  revokeFinancePublicationShareAction,
} from "@/app/(admin)/dashboard/finance/reports/publication-share-actions";
import type { FinancePublicationShareListItem } from "@/lib/finance/services/finance-publication-share-service";

export type FinancePublicationShareManagementLabels = {
  sectionTitle: string;
  empty: string;
  statusActive: string;
  statusExpired: string;
  statusRevoked: string;
  createdLabel: string;
  expiresLabel: string;
  creatorLabel: string;
  revoke: string;
  revoking: string;
  revokeFailed: string;
  copyUnavailable: string;
  loadFailed: string;
};

type Props = {
  publicationId: string;
  versionNumber: number;
  formattingLocale: string;
  labels: FinancePublicationShareManagementLabels;
  canRevoke: boolean;
  reloadKey?: number;
};

function statusLabel(
  status: FinancePublicationShareListItem["status"],
  labels: FinancePublicationShareManagementLabels,
): string {
  if (status === "ACTIVE") return labels.statusActive;
  if (status === "EXPIRED") return labels.statusExpired;
  return labels.statusRevoked;
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function FinancePublicationShareManagement({
  publicationId,
  versionNumber,
  formattingLocale,
  labels,
  canRevoke,
  reloadKey = 0,
}: Props) {
  const [shares, setShares] = useState<FinancePublicationShareListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listFinancePublicationSharesAction({ publicationId, versionNumber });
    setLoading(false);
    if (!result.ok) {
      setError(result.error || labels.loadFailed);
      setShares([]);
      return;
    }
    setShares(result.shares);
  }, [labels.loadFailed, publicationId, versionNumber]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const onRevoke = useCallback(
    async (shareId: string) => {
      setRevokingId(shareId);
      const result = await revokeFinancePublicationShareAction({ shareId });
      setRevokingId(null);
      if (!result.ok) {
        setError(result.error || labels.revokeFailed);
        return;
      }
      await load();
    },
    [labels.revokeFailed, load],
  );

  if (loading && shares.length === 0 && !error) {
    return (
      <p className="text-sm text-[var(--muted)]" data-finance-publication-share-management-loading>
        …
      </p>
    );
  }

  return (
    <section className="space-y-3" data-finance-publication-share-management>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{labels.sectionTitle}</h3>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {shares.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{labels.empty}</p>
      ) : (
        <ul className="divide-y divide-[var(--sce-surface-border-subtle)] rounded-md border border-[var(--sce-surface-border-subtle)]">
          {shares.map((share) => (
            <li
              key={share.id}
              className="flex flex-col gap-2 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              data-finance-publication-share-row
              data-finance-publication-share-status={share.status}
            >
              <div className="space-y-0.5">
                <p className="font-medium text-[var(--foreground)]">
                  {statusLabel(share.status, labels)}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {labels.createdLabel}: {formatDate(share.createdAt, formattingLocale)}
                  {share.createdByDisplayName
                    ? ` · ${labels.creatorLabel}: ${share.createdByDisplayName}`
                    : null}
                  {share.expiresAt
                    ? ` · ${labels.expiresLabel}: ${formatDate(share.expiresAt, formattingLocale)}`
                    : null}
                </p>
              </div>
              {canRevoke && share.status === "ACTIVE" ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={revokingId === share.id}
                  onClick={() => void onRevoke(share.id)}
                  data-finance-publication-share-revoke
                >
                  {revokingId === share.id ? labels.revoking : labels.revoke}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-[var(--muted)]">{labels.copyUnavailable}</p>
    </section>
  );
}
