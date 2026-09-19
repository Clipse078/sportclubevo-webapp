import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import { formatAttachmentSize } from "@/components/admin/communications/EmailAttachmentComposer";
import type { SerializedBillingCommunicationTimelineItem } from "@/lib/billing/billing-communication/billing-communication-timeline-types";

type Props = {
  items: SerializedBillingCommunicationTimelineItem[];
  canManage?: boolean;
  onReply?: (item: SerializedBillingCommunicationTimelineItem) => void;
  canReplyToItem?: (item: SerializedBillingCommunicationTimelineItem) => boolean;
};

function formatAddressList(addresses: string[]): string {
  return addresses.join(", ");
}

function CommunicationItem({
  item,
  onReply,
  showReply,
}: {
  item: SerializedBillingCommunicationTimelineItem;
  onReply?: (item: SerializedBillingCommunicationTimelineItem) => void;
  showReply?: boolean;
}) {
  const routeLabel = `${item.fromAddress} → ${formatAddressList(item.toAddresses)}`;

  return (
    <li
      className={`relative pb-6 last:pb-0 ${
        item.hasThreadParent
          ? "ml-3 border-l border-dashed border-[color-mix(in_srgb,var(--border)_55%,transparent)] pl-4"
          : ""
      }`}
    >
      <div className="space-y-2 rounded-md ring-1 ring-[color-mix(in_srgb,var(--border)_45%,transparent)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <BillingStatusBadge
            label={item.isOutbound ? "AUSGEHEND" : "EINGEHEND"}
            tone={item.isOutbound ? "default" : "muted"}
          />
          <time
            className="text-xs tabular-nums text-[var(--muted)]"
            dateTime={item.occurredAt}
          >
            {item.occurredAtFormatted}
          </time>
        </div>

        <p className="break-words text-sm text-[var(--foreground)]">{routeLabel}</p>

        {item.subject ? (
          <p className="break-words text-sm font-medium text-[var(--foreground)]">
            {item.subject}
          </p>
        ) : null}

        {item.attachments.length > 0 ? (
          <div className="space-y-1 text-xs text-[var(--muted)]">
            <p className="font-medium text-[var(--foreground)]">Anhänge</p>
            <ul className="space-y-0.5">
              {item.attachments.map((attachment) => (
                <li key={attachment.id} className="truncate">
                  <a
                    href={attachment.downloadUrl}
                    className="text-primary hover:underline"
                    title={attachment.filename}
                  >
                    {attachment.filename}
                  </a>
                  <span>{` · ${formatAttachmentSize(attachment.sizeBytes)}`}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <BillingStatusBadge label={item.statusLabel} tone={item.statusTone} />
          {item.status === "FAILED" ? (
            <span className="text-xs text-[var(--muted)]">
              Versand fehlgeschlagen — keine automatische Wiederholung.
            </span>
          ) : null}
          {item.deliveryStatusLabel ? (
            <BillingStatusBadge
              label={item.deliveryStatusLabel}
              tone={item.deliveryStatusTone ?? "default"}
            />
          ) : null}
          {showReply && onReply ? (
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => onReply(item)}
            >
              Antworten
            </button>
          ) : null}
        </div>

        {(item.ccAddresses.length > 0 ||
          item.bccAddresses.length > 0 ||
          item.hasThreadParent ||
          item.providerMessageId) && (
          <details className="text-xs text-[var(--muted)]">
            <summary className="cursor-pointer select-none">Details</summary>
            <dl className="mt-2 space-y-1 break-words">
              {item.hasThreadParent ? (
                <div>
                  <dt className="inline">Bezug </dt>
                  <dd className="inline">Antwort auf vorherige Nachricht</dd>
                </div>
              ) : null}
              {item.ccAddresses.length > 0 ? (
                <div>
                  <dt className="inline">CC </dt>
                  <dd className="inline">{formatAddressList(item.ccAddresses)}</dd>
                </div>
              ) : null}
              {item.bccAddresses.length > 0 ? (
                <div>
                  <dt className="inline">BCC </dt>
                  <dd className="inline">{formatAddressList(item.bccAddresses)}</dd>
                </div>
              ) : null}
              {item.providerMessageId ? (
                <div>
                  <dt className="inline">Provider-Referenz </dt>
                  <dd className="inline font-mono text-[0.6875rem]">{item.providerMessageId}</dd>
                </div>
              ) : null}
            </dl>
          </details>
        )}
      </div>
    </li>
  );
}

export default function NativeBillingInvoiceCommunicationTimeline({
  items,
  canManage,
  onReply,
  canReplyToItem,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="space-y-2 text-sm text-[var(--text-2)]">
        <p>Noch keine Kommunikation vorhanden.</p>
        <p>
          Versendete Rechnungen und eingehende Antworten erscheinen hier chronologisch, sobald
          sie über die Abrechnungskommunikation erfasst wurden.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-0">
      {items.map((item) => (
        <CommunicationItem
          key={item.id}
          item={item}
          onReply={onReply}
          showReply={Boolean(canManage && onReply && canReplyToItem?.(item))}
        />
      ))}
    </ol>
  );
}
