import StopImpersonationButton from "@/components/admin/layout/StopImpersonationButton";

type Props = {
  effectiveDisplayName: string;
};

export default function ImpersonationBanner({ effectiveDisplayName }: Props) {
  return (
    <div
      className="border-b border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="px-5 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sce-warning)]">
              Impersonation aktiv
            </p>
            <p className="mt-0.5 text-sm text-[var(--foreground)]">
              Du siehst SportClubEvo als{" "}
              <span className="font-semibold">{effectiveDisplayName}</span>.
            </p>
          </div>
          <StopImpersonationButton />
        </div>
      </div>
    </div>
  );
}
