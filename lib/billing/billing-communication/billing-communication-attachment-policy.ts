/**
 * Centralized billing communication attachment policy (BILLING-COMMS-01E).
 * Reuses tenant communication validation rules and limits.
 */
export {
  MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES as MAX_BILLING_COMMUNICATION_ATTACHMENT_SIZE_BYTES,
  MAX_COMMUNICATION_ATTACHMENT_TOTAL_BYTES as MAX_BILLING_COMMUNICATION_ATTACHMENT_TOTAL_BYTES,
  MAX_COMMUNICATION_ATTACHMENTS_PER_MESSAGE as MAX_BILLING_COMMUNICATION_ATTACHMENTS_PER_COMMUNICATION,
  validateCommunicationAttachment as validateBillingCommunicationAttachment,
  validateCommunicationAttachmentSet as validateBillingCommunicationAttachmentSet,
  CommunicationAttachmentValidationError as BillingCommunicationAttachmentValidationError,
} from "@/lib/communication/attachment-validation";
