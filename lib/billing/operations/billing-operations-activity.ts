import { NATIVE_BILLING_AUDIT_ACTIONS, NATIVE_BILLING_AUDIT_MODULE } from "@/lib/billing/native-billing-audit";
import type { BillingActivityItem, BillingActivityKind } from "./billing-operations-types";

export const BILLING_ACTIVITY_AUDIT_ACTIONS: ReadonlySet<string> = new Set([
  NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_FINALIZED,
  NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_DELIVERY_SENT,
  NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_DELIVERY_FAILED,
  NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_PAYMENT_RECORDED,
  NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_PAYMENT_REVERSED,
  NATIVE_BILLING_AUDIT_ACTIONS.CAMT054_RECONCILIATION_APPLIED,
  NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_VOIDED,
]);

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  afterJson: unknown;
  createdAt: Date;
};

function readStringField(json: unknown, key: string): string | null {
  if (!json || typeof json !== "object") return null;
  const value = (json as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function mapActionToKind(action: string): BillingActivityKind {
  switch (action) {
    case NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_FINALIZED:
      return "INVOICE_FINALIZED";
    case NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_DELIVERY_SENT:
      return "INVOICE_SENT";
    case NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_DELIVERY_FAILED:
      return "INVOICE_DELIVERY_FAILED";
    case NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_PAYMENT_RECORDED:
      return "PAYMENT_RECORDED";
    case NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_PAYMENT_REVERSED:
      return "PAYMENT_REVERSED";
    case NATIVE_BILLING_AUDIT_ACTIONS.CAMT054_RECONCILIATION_APPLIED:
      return "CAMT054_IMPORTED";
    default:
      return "OTHER";
  }
}

function activityPresentation(
  action: string,
  afterJson: unknown,
): { title: string; detail: string | null } {
  const invoiceKey = readStringField(afterJson, "invoiceKey");
  const invoiceNumber = readStringField(afterJson, "invoiceNumber");
  const importKey = readStringField(afterJson, "importKey");
  const amountMinor = readStringField(afterJson, "amountMinor");

  switch (action) {
    case NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_FINALIZED:
      return {
        title: "Rechnung finalisiert",
        detail: invoiceNumber ?? invoiceKey,
      };
    case NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_DELIVERY_SENT:
      return {
        title: "Rechnung versendet",
        detail: invoiceNumber ?? invoiceKey,
      };
    case NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_DELIVERY_FAILED:
      return {
        title: "Rechnungsversand fehlgeschlagen",
        detail: invoiceNumber ?? invoiceKey,
      };
    case NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_PAYMENT_RECORDED:
      return {
        title: "Zahlung erfasst",
        detail: invoiceNumber ?? amountMinor ?? invoiceKey,
      };
    case NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_PAYMENT_REVERSED:
      return {
        title: "Zahlung storniert",
        detail: invoiceNumber ?? invoiceKey,
      };
    case NATIVE_BILLING_AUDIT_ACTIONS.CAMT054_RECONCILIATION_APPLIED:
      return {
        title: "camt.054 Import verarbeitet",
        detail: importKey,
      };
    default:
      return { title: action, detail: null };
  }
}

function resolveActivityHref(
  kind: BillingActivityKind,
  afterJson: unknown,
): string | null {
  const invoiceKey = readStringField(afterJson, "invoiceKey");
  const importKey = readStringField(afterJson, "importKey");

  if (invoiceKey && kind !== "CAMT054_IMPORTED") {
    return `/dashboard/admin/commercial/billing/invoices/${invoiceKey}`;
  }
  if (importKey && kind === "CAMT054_IMPORTED") {
    return `/dashboard/admin/commercial/billing/reconciliation/imports/${importKey}`;
  }
  return null;
}

export function mapAuditLogToBillingActivity(row: AuditRow): BillingActivityItem {
  const kind = mapActionToKind(row.action);
  const { title, detail } = activityPresentation(row.action, row.afterJson);
  return {
    id: row.id,
    kind,
    title,
    detail,
    occurredAt: row.createdAt.toISOString(),
    href: resolveActivityHref(kind, row.afterJson),
  };
}

export function billingActivityModuleFilter() {
  return { moduleKey: NATIVE_BILLING_AUDIT_MODULE };
}
