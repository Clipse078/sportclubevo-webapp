/**
 * DS-08 bridge — billing tables delegate to canonical SceDataTable primitives.
 */
import type { ReactNode } from "react";
import {
  SceDataTable,
  SceDataTableCell,
  SceDataTableHead,
  SceDataTableHeaderCell,
  SceDataTableRow,
} from "@/components/sce/dense";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function BillingDataTableShell({ children, className }: Props) {
  return (
    <SceDataTable className={className} data-testid="billing-data-table">
      {children}
    </SceDataTable>
  );
}

export function BillingDataTableHead({ children }: { children: ReactNode }) {
  return <SceDataTableHead>{children}</SceDataTableHead>;
}

export function BillingDataTableRow({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <SceDataTableRow className={className} onClick={onClick}>
      {children}
    </SceDataTableRow>
  );
}

export function BillingDataTableCell({
  children,
  className,
  align,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <SceDataTableCell className={className} align={align}>
      {children}
    </SceDataTableCell>
  );
}

export function BillingDataTableHeaderCell({
  children,
  className,
  align,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <SceDataTableHeaderCell className={className} align={align}>
      {children}
    </SceDataTableHeaderCell>
  );
}
