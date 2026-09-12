type Props = {
  invoiceKey: string;
  status: string;
};

export default function NativeBillingInvoicePdfActions({ invoiceKey, status }: Props) {
  if (status === "DRAFT") {
    return null;
  }

  const pdfUrl = `/api/platform/billing/invoices/${encodeURIComponent(invoiceKey)}/pdf`;
  const downloadUrl = `${pdfUrl}?download=1`;

  return (
    <div className="flex flex-wrap gap-2">
      <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="fca-button-secondary">
        PDF anzeigen
      </a>
      <a href={downloadUrl} className="fca-button-secondary">
        PDF herunterladen
      </a>
    </div>
  );
}
