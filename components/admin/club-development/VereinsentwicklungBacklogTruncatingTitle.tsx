import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  href?: string;
  className?: string;
};

export default function VereinsentwicklungBacklogTruncatingTitle({ title, href, className }: Props) {
  const fullTextId = useId();
  const sharedClass = cn(
    "block min-w-0 truncate text-sm font-medium text-[var(--foreground)] hover:text-[var(--sce-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] rounded-sm",
    className,
  );

  return (
    <div className="min-w-0">
      {href ? (
        <Link href={href} className={sharedClass} title={title} aria-describedby={fullTextId}>
          {title}
        </Link>
      ) : (
        <span className={sharedClass} title={title} tabIndex={0} aria-describedby={fullTextId}>
          {title}
        </span>
      )}
      <span id={fullTextId} className="sr-only">
        {title}
      </span>
    </div>
  );
}