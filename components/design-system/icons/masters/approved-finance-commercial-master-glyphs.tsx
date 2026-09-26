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
      <rect x="10" y="14" width="44" height="39" rx="5" stroke="currentColor" strokeWidth="4"/><path d="M10 25h44M20 10v9M44 10v9" stroke="currentColor" strokeWidth="4"/><path d="M22 39l6 6 14-15" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/budget.svg` (V2 monochrome artwork). */
export function BudgetApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="4"/><path d="M32 10v22h22" stroke="currentColor" strokeWidth="4"/><path d="M32 32L17 48" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/business-club.svg` (V2 monochrome artwork). */
export function BusinessClubApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M10 52V21h44v31M18 21V12h28v9" stroke="currentColor" strokeWidth="4"/><path d="M21 31h8M35 31h8M21 40h8M35 40h8" stroke="currentColor" strokeWidth="3"/><path d="M28 52V44h8v8" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/commercial-account.svg` (V2 monochrome artwork). */
export function CommercialAccountApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="9" y="17" width="46" height="34" rx="6" stroke="currentColor" strokeWidth="4"/><circle cx="22" cy="31" r="6" stroke="currentColor" strokeWidth="3"/><path d="M15 44c1-6 3-9 7-9s6 3 7 9M36 29h11M36 37h11" stroke="currentColor" strokeWidth="3"/><path d="M42 45h6" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/contract.svg` (V2 monochrome artwork). */
export function ContractApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M15 8h27l8 8v40H15V8z" stroke="currentColor" strokeWidth="4"/><path d="M42 8v10h8M23 29h19M23 37h19M23 45h11" stroke="currentColor" strokeWidth="3"/><path d="M37 49l4 4 8-10" stroke="currentColor" strokeWidth="3"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/cost-centre.svg` (V2 monochrome artwork). */
export function CostCentreApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="4"/><circle cx="32" cy="32" r="12" stroke="currentColor" strokeWidth="4"/><circle cx="32" cy="32" r="4" fill="currentColor" stroke="none"/><path d="M32 10v10M54 32H44M32 54V44M10 32h10" stroke="currentColor" strokeWidth="3"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/expense.svg` (V2 monochrome artwork). */
export function ExpenseApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M12 18h40v34H12z" stroke="currentColor" strokeWidth="4"/><path d="M20 27h24M20 35h15" stroke="currentColor" strokeWidth="3"/><path d="M32 42v10M27 47l5 5 5-5" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/facility-booking.svg` (V2 monochrome artwork). */
export function FacilityBookingApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M9 51V26l18-11 18 11v25M17 51V32h20v19" stroke="currentColor" strokeWidth="4"/><rect x="36" y="12" width="19" height="19" rx="4" stroke="currentColor" strokeWidth="4"/><path d="M40 21l4 4 7-9" stroke="currentColor" strokeWidth="3"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/finance.svg` (V2 monochrome artwork). */
export function FinanceApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M9 51h46M14 46V29M26 46V21M38 46V33M50 46V13" stroke="currentColor" strokeWidth="4"/><path d="M14 23l12-9 12 9 12-15" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/payment.svg` (V2 monochrome artwork). */
export function PaymentApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="8" y="17" width="48" height="32" rx="6" stroke="currentColor" strokeWidth="4"/><path d="M8 27h48" stroke="currentColor" strokeWidth="4"/><path d="M17 39h11" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/qr-invoice.svg` (V2 monochrome artwork). */
export function QrInvoiceApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M11 8h31l10 10v38H11V8z" stroke="currentColor" strokeWidth="4"/><path d="M42 8v11h10" stroke="currentColor" strokeWidth="3"/><rect x="19" y="29" width="8" height="8" stroke="currentColor" strokeWidth="3"/><rect x="36" y="29" width="8" height="8" stroke="currentColor" strokeWidth="3"/><path d="M19 45h8v7M36 45h4v7h6" stroke="currentColor" strokeWidth="3"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/receipt.svg` (V2 monochrome artwork). */
export function ReceiptApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M16 8h32v48l-5-4-5 4-6-4-6 4-5-4-5 4V8z" stroke="currentColor" strokeWidth="4"/><path d="M23 20h18M23 29h18M23 38h10" stroke="currentColor" strokeWidth="3"/><circle cx="40" cy="39" r="4" fill="currentColor" stroke="none"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/revenue.svg` (V2 monochrome artwork). */
export function RevenueApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M12 18h40v34H12z" stroke="currentColor" strokeWidth="4"/><path d="M20 27h24M20 35h15" stroke="currentColor" strokeWidth="3"/><path d="M32 52V42M27 47l5-5 5 5" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/sponsorship-management.svg` (V2 monochrome artwork). */
export function SponsorshipManagementApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M11 20l9-8 12 8 12-8 9 8-5 30H16l-5-30z" stroke="currentColor" strokeWidth="4"/><circle cx="45" cy="44" r="9" stroke="currentColor" strokeWidth="3"/><path d="M45 40v8M41 44h8" stroke="currentColor" strokeWidth="3"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/subscription.svg` (V2 monochrome artwork). */
export function SubscriptionApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M18 15h28l8 10-22 28L10 25l8-10z" stroke="currentColor" strokeWidth="4"/><path d="M10 25h44M24 15l8 38 8-38" stroke="currentColor" strokeWidth="3"/><circle cx="46" cy="19" r="4" fill="currentColor" stroke="none"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/transaction.svg` (V2 monochrome artwork). */
export function TransactionApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M12 23h35M40 16l7 7-7 7" stroke="currentColor" strokeWidth="4"/><path d="M52 41H17M24 34l-7 7 7 7" stroke="currentColor" strokeWidth="4"/><circle cx="32" cy="32" r="5" stroke="currentColor" strokeWidth="3"/>
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
