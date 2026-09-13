import Link from "next/link";
import { formatBillingDateDisplay } from "@/lib/billing/native-billing-presentation";
import type { BillingActivityItem } from "@/lib/billing/operations/billing-operations-types";

type Props = {
  items: BillingActivityItem[];
};

export default function BillingOperationsActivityFeed({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Noch keine Abrechnungsaktivitäten im Audit-Protokoll.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-4 text-sm">
          <div className="min-w-0">
            {item.href ? (
              <Link href={item.href} className="font-medium text-primary hover:underline">
                {item.title}
              </Link>
            ) : (
              <span className="font-medium">{item.title}</span>
            )}
            {item.detail ? (
              <p className="truncate text-muted-foreground">{item.detail}</p>
            ) : null}
          </div>
          <time
            className="shrink-0 text-xs text-muted-foreground"
            dateTime={item.occurredAt}
          >
            {formatBillingDateDisplay(item.occurredAt.slice(0, 10))}
          </time>
        </li>
      ))}
    </ul>
  );
}
