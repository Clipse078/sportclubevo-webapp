import type {
  BillingCommunicationChannel,
  BillingCommunicationDirection,
  BillingCommunicationStatus,
} from "@prisma/client";

export type BillingCommunicationRecord = {
  id: string;
  key: string;
  tenantId: string;
  direction: BillingCommunicationDirection;
  channel: BillingCommunicationChannel;
  status: BillingCommunicationStatus;
  invoiceId: string | null;
  billingContractId: string | null;
  invoiceDeliveryId: string | null;
  senderAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  bccAddresses: string[];
  subject: string | null;
  textBody: string | null;
  htmlBody: string | null;
  sentAt: Date | null;
  receivedAt: Date | null;
  provider: string | null;
  providerMessageId: string | null;
  internetMessageId: string | null;
  inReplyTo: string | null;
  referencesHeader: string | null;
  createdAt: Date;
  updatedAt: Date;
};
