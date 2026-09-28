import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";

type CommunicationHubInboxSectionProps = {
  href: string;
};

/** Prominent operational entry to Kommunikationscenter (SCE-COMM-UX-02). */
export function CommunicationHubInboxSection({ href }: CommunicationHubInboxSectionProps) {
  return (
    <section aria-labelledby="communication-hub-inbox-heading">
      <CommunicationContentSurface className="border-[var(--border-strong)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
              aria-hidden
            >
              <Inbox className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2
                id="communication-hub-inbox-heading"
                className="text-lg font-semibold text-[var(--foreground)]"
              >
                Kommunikationscenter
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-2)]">
                Nachrichten und Antworten zentral bearbeiten.
              </p>
            </div>
          </div>
          <Link
            href={href}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--sce-primary)] px-4 py-2.5 text-sm font-semibold text-white no-underline motion-safe:transition-opacity motion-safe:duration-150 motion-safe:hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          >
            Kommunikationscenter öffnen
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </CommunicationContentSurface>
    </section>
  );
}
