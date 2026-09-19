import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  findBillingContractById,
  findInvoiceByKey,
  findInvoiceRecipientSnapshot,
} from "@/lib/billing/native-billing-commercial-repository";
import {
  NativeBillingNotFoundError,
  NativeBillingValidationError,
} from "@/lib/billing/native-billing-types";
import { BillingEmailDryRunFailureError, sendBillingEmail } from "@/lib/billing/invoice-delivery/billing-email-transport";
import { resolveBillingEmailIdentity } from "@/lib/billing/invoice-delivery/resolve-billing-email-identity";
import { normalizeInternetMessageId } from "@/lib/billing/billing-inbound/billing-inbound-message-id";
import {
  assertTenantMatchesBillingCustomer,
  resolveTenantIdForBillingCustomer,
} from "./billing-communication-tenant";
import {
  createOutboundBillingCommunication,
  findBillingCommunicationByIdForInvoiceTenant,
} from "./billing-communication-repository";
import {
  assertNoHeaderInjection,
  validateBillingCommunicationRecipients,
} from "./billing-communication-recipients";
import {
  buildEmailThreadingHeaders,
  buildReplySubject,
  collectInternalBillingEmailAddresses,
  deriveReplyRecipient,
} from "./billing-communication-reply";
import { buildBillingCorrespondenceEmailContent } from "./billing-correspondence-email-template";
import {
  buildBillingCorrespondenceTransportPayload,
  resolvePersistedPlatformBccAddresses,
} from "./billing-correspondence-transport-payload";
import { serializeBillingCommunicationTimeline } from "./billing-communication-serializers";
import type { SerializedBillingCommunicationTimelineItem } from "./billing-communication-timeline-types";
import type { BillingCommunicationRecord } from "./billing-communication-types";

const sendBodySchema = z.object({
  mode: z.enum(["compose", "reply"]),
  parentCommunicationId: z.string().trim().min(1).optional(),
  to: z.array(z.string()).optional(),
  cc: z.array(z.string()).optional(),
  subject: z.string(),
  message: z.string(),
  tenantId: z.string().optional(),
  fromAddress: z.string().optional(),
  bcc: z.union([z.string(), z.array(z.string())]).optional(),
  providerMessageId: z.string().optional(),
});

export type SendInvoiceBillingCommunicationInput = z.infer<typeof sendBodySchema>;

async function resolveBillingContractIdForInvoice(input: {
  billingContractId: string | null;
  billingCustomerId: string;
}): Promise<string | null> {
  if (!input.billingContractId) {
    return null;
  }
  const contract = await findBillingContractById(input.billingContractId);
  if (!contract) {
    throw new NativeBillingValidationError("Vertrag für diese Rechnung wurde nicht gefunden.");
  }
  if (contract.billingCustomerId !== input.billingCustomerId) {
    throw new NativeBillingValidationError(
      "Der Vertrag gehört nicht zum Rechnungskunden dieser Rechnung.",
    );
  }
  return contract.id;
}

export function buildDefaultComposeSubject(invoiceNumber: string | null): string {
  if (invoiceNumber?.trim()) {
    return `Rechnung ${invoiceNumber.trim()} – SportClubEvo`;
  }
  return "SportClubEvo Abrechnung";
}

export async function resolveInvoiceBillingRecipientEmail(
  invoiceId: string,
): Promise<string | null> {
  const recipient = await findInvoiceRecipientSnapshot(invoiceId);
  const email = recipient?.invoiceEmail?.trim();
  if (!email) return null;
  const parsed = z.string().email().safeParse(email);
  return parsed.success ? parsed.data : null;
}

export type InvoiceBillingCommunicationComposeDefaults = {
  fromAddress: string;
  defaultTo: string | null;
  defaultSubject: string;
};

export async function getInvoiceBillingCommunicationComposeDefaults(
  invoiceKey: string,
): Promise<InvoiceBillingCommunicationComposeDefaults> {
  const invoice = await findInvoiceByKey(invoiceKey);
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  const identity = await resolveBillingEmailIdentity();
  const defaultTo = await resolveInvoiceBillingRecipientEmail(invoice.id);
  return {
    fromAddress: identity.from,
    defaultTo,
    defaultSubject: buildDefaultComposeSubject(invoice.invoiceNumber),
  };
}

function mapTransportFailure(error: unknown): string {
  if (error instanceof BillingEmailDryRunFailureError) {
    return "Die Nachricht konnte nicht gesendet werden.";
  }
  if (error instanceof Error) {
    if (/password|auth|credential/i.test(error.message)) {
      return "Die Nachricht konnte nicht gesendet werden.";
    }
    return "Die Nachricht konnte nicht gesendet werden.";
  }
  return "Die Nachricht konnte nicht gesendet werden.";
}

export async function sendInvoiceBillingCommunication(
  invoiceKey: string,
  rawBody: unknown,
): Promise<{ communication: SerializedBillingCommunicationTimelineItem }> {
  const parsed = sendBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new NativeBillingValidationError("Ungültige Anfrage.");
  }
  const body = parsed.data;

  if (body.mode === "reply" && !body.parentCommunicationId) {
    throw new NativeBillingValidationError("Antwort-Kontext fehlt.");
  }

  const invoice = await findInvoiceByKey(invoiceKey);
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  if (invoice.status === "DRAFT") {
    throw new NativeBillingValidationError(
      "Für Entwurfsrechnungen ist noch keine Kommunikation möglich.",
    );
  }

  const tenantId = await resolveTenantIdForBillingCustomer(invoice.billingCustomerId);
  await assertTenantMatchesBillingCustomer(tenantId, invoice.billingCustomerId);

  const identity = await resolveBillingEmailIdentity();
  const internalAddresses = collectInternalBillingEmailAddresses({
    fromAddress: identity.from,
    replyToAddress: identity.replyTo,
  });

  let parent: BillingCommunicationRecord | null = null;
  if (body.mode === "reply") {
    parent = await findBillingCommunicationByIdForInvoiceTenant({
      id: body.parentCommunicationId!,
      tenantId,
      invoiceId: invoice.id,
    });
    if (!parent) {
      throw new NativeBillingValidationError("Kommunikationsbezug ist ungültig.");
    }
  }

  const subject = assertNoHeaderInjection(body.subject, "Betreff");
  if (!subject) {
    throw new NativeBillingValidationError("Betreff ist erforderlich.");
  }

  const message = body.message.trim();
  if (!message) {
    throw new NativeBillingValidationError("Nachricht ist erforderlich.");
  }

  let toInput = body.to ?? [];
  if (body.mode === "reply" && parent) {
    const replyTo = deriveReplyRecipient(
      {
        direction: parent.direction,
        fromAddress: parent.senderAddress,
        toAddresses: parent.toAddresses,
        ccAddresses: parent.ccAddresses,
      },
      internalAddresses,
    );
    if (!replyTo) {
      throw new NativeBillingValidationError("Für diese Nachricht ist keine Antwort möglich.");
    }
    if (toInput.length === 0) {
      toInput = [replyTo];
    }
  }

  if (body.mode === "compose" && toInput.length === 0) {
    const defaultTo = await resolveInvoiceBillingRecipientEmail(invoice.id);
    if (defaultTo) {
      toInput = [defaultTo];
    }
  }

  const { to, cc } = validateBillingCommunicationRecipients({
    to: toInput,
    cc: body.cc,
  });

  const finalSubject = body.mode === "reply" ? buildReplySubject(subject) : subject;

  const emailContent = buildBillingCorrespondenceEmailContent(message);
  const threading =
    parent != null
      ? buildEmailThreadingHeaders({
          internetMessageId: parent.internetMessageId,
          referencesHeader: parent.referencesHeader,
        })
      : { inReplyTo: null, referencesHeader: null };

  const billingContractId = await resolveBillingContractIdForInvoice({
    billingContractId: invoice.billingContractId,
    billingCustomerId: invoice.billingCustomerId,
  });

  const bccAddresses = resolvePersistedPlatformBccAddresses();
  const idempotencyKey = randomUUID();

  const transportPayload = buildBillingCorrespondenceTransportPayload({
    from: identity.from,
    to,
    cc,
    replyTo: identity.replyTo,
    subject: finalSubject,
    html: emailContent.html,
    text: emailContent.text,
    idempotencyKey,
    inReplyTo: threading.inReplyTo,
    referencesHeader: threading.referencesHeader,
  });

  let transportResult;
  try {
    transportResult = await sendBillingEmail(transportPayload);
  } catch (error) {
    await createOutboundBillingCommunication({
      tenantId,
      invoiceId: invoice.id,
      billingContractId,
      invoiceDeliveryId: null,
      parentCommunicationId: parent?.id ?? null,
      senderAddress: identity.from,
      toAddresses: to,
      ccAddresses: cc,
      bccAddresses,
      subject: finalSubject,
      textBody: emailContent.text,
      htmlBody: emailContent.html,
      sentAt: null,
      status: "FAILED",
      provider: null,
      providerMessageId: null,
      inReplyTo: threading.inReplyTo,
      referencesHeader: threading.referencesHeader,
    });
    throw new NativeBillingValidationError(mapTransportFailure(error));
  }

  const sentAt = new Date();
  const record = await createOutboundBillingCommunication({
    tenantId,
    invoiceId: invoice.id,
    billingContractId,
    invoiceDeliveryId: null,
    parentCommunicationId: parent?.id ?? null,
    senderAddress: transportResult.from,
    toAddresses: to,
    ccAddresses: cc,
    bccAddresses,
    subject: finalSubject,
    textBody: emailContent.text,
    htmlBody: emailContent.html,
    sentAt,
    status: "SENT",
    provider: transportResult.provider,
    providerMessageId: transportResult.messageId,
    internetMessageId: normalizeInternetMessageId(transportResult.messageId),
    inReplyTo: threading.inReplyTo,
    referencesHeader: threading.referencesHeader,
  });

  const [serialized] = serializeBillingCommunicationTimeline([
    {
      id: record.id,
      direction: record.direction,
      channel: record.channel,
      status: record.status,
      subject: record.subject,
      fromAddress: record.senderAddress,
      toAddresses: record.toAddresses,
      ccAddresses: record.ccAddresses,
      bccAddresses: record.bccAddresses,
      sentAt: record.sentAt,
      receivedAt: record.receivedAt,
      createdAt: record.createdAt,
      internetMessageId: record.internetMessageId,
      providerMessageId: record.providerMessageId,
      parentCommunicationId: record.parentCommunicationId,
      invoiceDeliveryId: record.invoiceDeliveryId,
      invoiceDeliveryStatus: null,
    },
  ]);

  return { communication: serialized };
}
