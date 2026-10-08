import StopImpersonationButton from "@/components/admin/layout/StopImpersonationButton";

type Props = {
  effectiveDisplayName: string;
  actorDisplayName: string;
};

export default function ImpersonationBanner({
  effectiveDisplayName,
  actorDisplayName,
}: Props) {
  return (
    <div
      className="sce-impersonation-safety-banner border-b border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="px-5 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sce-warning)]">
              Benutzeransicht aktiv
            </p>
            <p className="mt-0.5 text-sm text-[var(--foreground)]">
              Du bist als{" "}
              <span className="font-semibold">{effectiveDisplayName}</span> unterwegs
              und handelst mit deren Berechtigungen. Angemeldet als{" "}
              <span className="font-semibold">{actorDisplayName}</span>.
            </p>
          </div>
          <StopImpersonationButton />
        </div>
      </div>
    </div>
  );
}
