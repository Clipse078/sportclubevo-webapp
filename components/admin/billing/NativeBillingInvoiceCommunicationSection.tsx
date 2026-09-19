"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import NativeBillingInvoiceCommunicationTimeline from "@/components/admin/billing/NativeBillingInvoiceCommunicationTimeline";
import NativeBillingInvoiceCommunicationComposerDialog, {
  type CommunicationComposerInitialValues,
} from "@/components/admin/billing/NativeBillingInvoiceCommunicationComposerDialog";
import {
  buildReplySubject,
  canReplyToCommunication,
  deriveReplyRecipient,
} from "@/lib/billing/billing-communication/billing-communication-reply";
import type { SerializedBillingCommunicationTimelineItem } from "@/lib/billing/billing-communication/billing-communication-timeline-types";

type Props = {
  invoiceKey: string;
  items: SerializedBillingCommunicationTimelineItem[];
  canManage: boolean;
  fromAddress: string;
  defaultTo: string | null;
  defaultSubject: string;
  internalEmailAddresses: string[];
};

export default function NativeBillingInvoiceCommunicationSection({
  invoiceKey,
  items,
  canManage,
  fromAddress,
  defaultTo,
  defaultSubject,
  internalEmailAddresses,
}: Props) {
  const router = useRouter();
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"compose" | "reply">("compose");
  const [composerInitial, setComposerInitial] = useState<CommunicationComposerInitialValues>({
    to: defaultTo ?? "",
    cc: "",
    subject: defaultSubject,
    message: "",
  });

  const internalSet = useMemo(
    () => new Set(internalEmailAddresses.map((entry) => entry.toLowerCase())),
    [internalEmailAddresses],
  );

  function openCompose() {
    setComposerMode("compose");
    setComposerInitial({
      to: defaultTo ?? "",
      cc: "",
      subject: defaultSubject,
      message: "",
    });
    setComposerOpen(true);
  }

  function openReply(item: SerializedBillingCommunicationTimelineItem) {
    const replyTo = deriveReplyRecipient(
      {
        direction: item.direction,
        fromAddress: item.fromAddress,
        toAddresses: item.toAddresses,
        ccAddresses: item.ccAddresses,
      },
      internalSet,
    );
    setComposerMode("reply");
    setComposerInitial({
      to: replyTo ?? "",
      cc: "",
      subject: buildReplySubject(item.subject),
      message: "",
      parentCommunicationId: item.id,
    });
    setComposerOpen(true);
  }

  function itemCanReply(item: SerializedBillingCommunicationTimelineItem): boolean {
    return canReplyToCommunication(
      {
        direction: item.direction,
        fromAddress: item.fromAddress,
        toAddresses: item.toAddresses,
        ccAddresses: item.ccAddresses,
      },
      internalSet,
    );
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" className="fca-button-secondary" onClick={openCompose}>
            Neue Nachricht
          </button>
        </div>
      ) : null}

      <NativeBillingInvoiceCommunicationTimeline
        items={items}
        canManage={canManage}
        onReply={canManage ? openReply : undefined}
        canReplyToItem={canManage ? itemCanReply : undefined}
      />

      {composerOpen ? (
        <NativeBillingInvoiceCommunicationComposerDialog
          open={composerOpen}
          mode={composerMode}
          invoiceKey={invoiceKey}
          fromAddress={fromAddress}
          initial={composerInitial}
          onClose={() => setComposerOpen(false)}
          onSent={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
