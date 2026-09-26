import {
  resolveSceIconPixelSize,
  type SceIconGlyphProps,
} from "../SceIcon.types";
import { SceIconSvg } from "../SceIconSvg";
import { SCE_APPROVED_HERO_VIEWBOX } from "./approved-hero-meta";

type ApprovedMasterGlyphProps = SceIconGlyphProps;

function masterSvgProps({
  className,
  size = 24,
  title,
}: ApprovedMasterGlyphProps) {
  return {
    size: resolveSceIconPixelSize(size),
    viewBox: SCE_APPROVED_HERO_VIEWBOX,
    className,
    title,
  };
}

/** Geometry copied exactly from `public/images/icons/booking.svg` (V2 monochrome artwork). */
export function BookingApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="9" y="12" width="46" height="43" rx="7"/><path d="M9 24h46M20 8v9M44 8v9"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/budget.svg` (V2 monochrome artwork). */
export function BudgetApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="32" r="23"/><path d="M40 22c-2-3-5-5-9-5-5 0-9 3-9 7 0 11 20 5 20 16 0 4-4 7-10 7-5 0-9-2-11-6M32 12v40"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/business-club.svg` (V2 monochrome artwork). */
export function BusinessClubApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M10 55h44M15 55V20l17-10 17 10v35M24 55V41h16v14M23 27h4M37 27h4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/commercial-account.svg` (V2 monochrome artwork). */
export function CommercialAccountApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M10 55h44M15 55V20l17-10 17 10v35M24 55V41h16v14M23 27h4M37 27h4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/contract.svg` (V2 monochrome artwork). */
export function ContractApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M16 8h23l11 11v37H16Z"/><path d="M39 8v12h11M23 31h20M23 40h20M23 49h13"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/cost-centre.svg` (V2 monochrome artwork). */
export function CostCentreApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="32" r="23"/><path d="M40 22c-2-3-5-5-9-5-5 0-9 3-9 7 0 11 20 5 20 16 0 4-4 7-10 7-5 0-9-2-11-6M32 12v40"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/expense.svg` (V2 monochrome artwork). */
export function ExpenseApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M32 10v38M20 36l12 12 12-12"/><path d="M12 54h40"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/facility-booking.svg` (V2 monochrome artwork). */
export function FacilityBookingApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="9" y="12" width="46" height="43" rx="7"/><path d="M9 24h46M20 8v9M44 8v9"/><path d="M19 38l7 7 18-17"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/finance.svg` (V2 monochrome artwork). */
export function FinanceApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="32" r="23"/><path d="M40 22c-2-3-5-5-9-5-5 0-9 3-9 7 0 11 20 5 20 16 0 4-4 7-10 7-5 0-9-2-11-6M32 12v40"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/payment.svg` (V2 monochrome artwork). */
export function PaymentApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="8" y="16" width="48" height="34" rx="6"/><path d="M8 27h48M17 40h10"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/qr-invoice.svg` (V2 monochrome artwork). */
export function QrInvoiceApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="9" y="9" width="16" height="16"/><rect x="39" y="9" width="16" height="16"/><rect x="9" y="39" width="16" height="16"/><path d="M36 36h7v7h-7zM48 36h7M36 49h7M48 48h7v7"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/receipt.svg` (V2 monochrome artwork). */
export function ReceiptApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M16 8h32v48l-6-4-5 4-5-4-5 4-5-4-6 4Z"/><path d="M23 22h18M23 32h18M23 42h10"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/revenue.svg` (V2 monochrome artwork). */
export function RevenueApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M32 54V16M20 28l12-12 12 12"/><path d="M12 10h40"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/sponsorship-management.svg` (V2 monochrome artwork). */
export function SponsorshipManagementApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M10 32h12l7-7 7 7h18M10 42h44"/><circle cx="32" cy="18" r="7"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/subscription.svg` (V2 monochrome artwork). */
export function SubscriptionApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M16 18a20 20 0 0 1 33 4M48 12l1 10-10-1M48 46a20 20 0 0 1-33-4M16 52l-1-10 10 1"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/transaction.svg` (V2 monochrome artwork). */
export function TransactionApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M10 22h38M40 14l8 8-8 8M54 42H16M24 34l-8 8 8 8"/>
    </SceIconSvg>
  );
}

export const SCE_APPROVED_FINANCE_COMMERCIAL_MASTER_GLYPHS = [
  BookingApprovedMasterGlyph,
  BudgetApprovedMasterGlyph,
  BusinessClubApprovedMasterGlyph,
  CommercialAccountApprovedMasterGlyph,
  ContractApprovedMasterGlyph,
  CostCentreApprovedMasterGlyph,
  ExpenseApprovedMasterGlyph,
  FacilityBookingApprovedMasterGlyph,
  FinanceApprovedMasterGlyph,
  PaymentApprovedMasterGlyph,
  QrInvoiceApprovedMasterGlyph,
  ReceiptApprovedMasterGlyph,
  RevenueApprovedMasterGlyph,
  SponsorshipManagementApprovedMasterGlyph,
  SubscriptionApprovedMasterGlyph,
  TransactionApprovedMasterGlyph,
] as const;
