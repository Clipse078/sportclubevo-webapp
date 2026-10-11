import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { SceSectionHeader } from "@/components/sce/workspace/SceSectionHeader";

type Props = {
  id?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  testId?: string;
};

/** Training record section — SCE-UI-STANDARD-01 icon-led header when `icon` is set. */
export default function TrainingRecordSection({
  id,
  title,
  description,
  icon,
  children,
  className,
  testId,
}: Props) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 px-4 py-4 md:px-5 md:py-5", className)}
      data-testid={testId}
    >
      {icon ? (
        <SceSectionHeader title={title} description={description} icon={icon} className="mb-3" />
      ) : (
        <div className="mb-3 space-y-0.5">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
          {description ? <p className="text-xs text-[var(--text-2)]">{description}</p> : null}
        </div>
      )}
      {children}
    </section>
  );
}
