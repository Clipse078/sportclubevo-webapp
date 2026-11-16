import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  SCE_CD_SECTION_BODY_CLASS,
  SCE_CD_SECTION_HEADER_CLASS,
  SCE_CD_SECTION_SHELL_CLASS,
} from "./sce-club-development-surface-styles";

type Props = {
  title: string;
  children: ReactNode;
  href?: string;
  linkLabel?: string;
  headerAside?: ReactNode;
  bodyClassName?: string;
  testId?: string;
  linkTestId?: string;
};

export default function SceClubDevelopmentSectionShell({
  title,
  children,
  href,
  linkLabel,
  headerAside,
  bodyClassName,
  testId,
  linkTestId,
}: Props) {
  return (
    <section className={SCE_CD_SECTION_SHELL_CLASS} data-testid={testId}>
      <div className={SCE_CD_SECTION_HEADER_CLASS}>
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
        {headerAside ??
          (href && linkLabel ? (
            <Link
              href={href}
              data-testid={linkTestId}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--sce-primary)] hover:underline"
            >
              {linkLabel}
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          ) : null)}
      </div>
      <div className={bodyClassName ?? SCE_CD_SECTION_BODY_CLASS}>{children}</div>
    </section>
  );
}