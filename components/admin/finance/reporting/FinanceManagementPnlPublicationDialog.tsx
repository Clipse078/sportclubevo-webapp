"use client";

import { useCallback, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import {
  loadFinancePublicationInspectionAction,
  publishFinanceManagementPnlAction,
} from "@/app/(admin)/dashboard/finance/reports/publication-actions";
import type { SerializedFinancePublicationSnapshotPayload } from "@/lib/finance/presentation/serialize-publication-snapshot";

export type FinanceManagementPnlPublicationLabels = {
  publishAction: string;
  dialogTitle: string;
  dialogDescription: string;
  dialogImmutability: string;
  dialogContentLabel: string;
  dialogContentValue: string;
  dialogPeriodLabel: string;
  confirmPublish: string;
  cancel: string;
  publishing: string;
  successTitle: string;
  successBody: string;
  viewLatest: string;
  notPublishable: string;
  forbidden: string;
  versionLabel: string;
  publishedAtLabel: string;
  inspectionTitle: string;
  inspectionEmpty: string;
  close: string;
};

type Props = {
  financeYearId: string;
  financeYearName: string;
  canPublish: boolean;
  reportPublishable: boolean;
  labels: FinanceManagementPnlPublicationLabels;
};

export function FinanceManagementPnlPublicationDialog({
  financeYearId,
  financeYearName,
  canPublish,
  reportPublishable,
  labels,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [publicationId, setPublicationId] = useState<string | null>(null);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectionSnapshot, setInspectionSnapshot] =
    useState<SerializedFinancePublicationSnapshotPayload | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setBusy(false);
    setPublishedVersion(null);
    setPublishedAt(null);
    setPublicationId(null);
  }, []);

  const closeDialog = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  const onPublish = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await publishFinanceManagementPnlAction({ financeYearId });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPublicationId(result.publicationId);
    setPublishedVersion(result.versionNumber);
    setPublishedAt(result.publishedAt);
  }, [financeYearId]);

  const onInspect = useCallback(async () => {
    if (!publicationId || publishedVersion == null) return;
    setInspectionOpen(true);
    const result = await loadFinancePublicationInspectionAction({
      financeYearId,
      publicationId,
      versionNumber: publishedVersion,
    });
    if (result.ok && result.latestSnapshot) {
      setInspectionSnapshot(result.latestSnapshot);
    } else {
      setInspectionSnapshot(null);
    }
  }, [financeYearId, publicationId, publishedVersion]);

  if (!canPublish) {
    return null;
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={!reportPublishable}
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          {labels.publishAction}
        </Button>
      </div>

      <Dialog
        open={open}
        onClose={closeDialog}
        title={publishedVersion != null ? labels.successTitle : labels.dialogTitle}
        description={
          publishedVersion == null
            ? labels.dialogDescription.replace("{year}", financeYearName)
            : labels.successBody.replace("{version}", String(publishedVersion))
        }
        footer={
          publishedVersion != null ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onInspect}>
                {labels.viewLatest}
              </Button>
              <Button type="button" onClick={closeDialog}>
                {labels.close}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeDialog} disabled={busy}>
                {labels.cancel}
              </Button>
              <Button type="button" onClick={onPublish} disabled={busy || !reportPublishable}>
                {busy ? labels.publishing : labels.confirmPublish}
              </Button>
            </div>
          )
        }
      >
        {publishedVersion == null ? (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>{labels.dialogImmutability}</p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground">{labels.dialogPeriodLabel}</dt>
                <dd>{financeYearName}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">{labels.dialogContentLabel}</dt>
                <dd>{labels.dialogContentValue}</dd>
              </div>
            </dl>
            {error ? <p className="text-destructive">{error}</p> : null}
            {!reportPublishable ? <p>{labels.notPublishable}</p> : null}
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              {labels.versionLabel.replace("{version}", String(publishedVersion))}
              {publishedAt ? (
                <>
                  {" · "}
                  {labels.publishedAtLabel}: {new Date(publishedAt).toLocaleString()}
                </>
              ) : null}
            </p>
          </div>
        )}
      </Dialog>

      <Dialog
        open={inspectionOpen}
        onClose={() => setInspectionOpen(false)}
        title={labels.inspectionTitle}
        footer={
          <Button type="button" onClick={() => setInspectionOpen(false)}>
            {labels.close}
          </Button>
        }
      >
        {inspectionSnapshot ? (
          <div className="space-y-2 text-sm">
            <p>{inspectionSnapshot.title}</p>
            <p className="text-muted-foreground">
              {labels.versionLabel.replace(
                "{version}",
                String(inspectionSnapshot.publicationVersion),
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{labels.inspectionEmpty}</p>
        )}
      </Dialog>
    </>
  );
}
