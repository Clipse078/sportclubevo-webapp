import { PhysicalInfoboardViewport } from "@/components/infoboard/shared/PhysicalInfoboardViewport";

type InfoboardPreviewEmbedStateProps = {
  kind: "unauthenticated" | "forbidden";
};

/**
 * Explicit denial surface for /infoboard/preview-frame. Must never fall back to
 * the personal dashboard or full app chrome inside the preview iframe.
 */
export function InfoboardPreviewEmbedState({
  kind,
}: InfoboardPreviewEmbedStateProps) {
  const title =
    kind === "unauthenticated"
      ? "Anmeldung erforderlich"
      : "Keine Berechtigung für die Infoboard-Vorschau";
  const detail =
    kind === "unauthenticated"
      ? "Melde dich an, um die eingebettete Vorschau zu laden."
      : "Dein Benutzerkonto hat keinen Lesezugriff auf das Infoboard in diesem Mandanten.";

  return (
    <PhysicalInfoboardViewport>
      <div
        className="flex h-full w-full flex-col items-center justify-center bg-slate-950 px-10 text-center text-white"
        data-testid={`infoboard-preview-embed-${kind}`}
        role="alert"
      >
        <p className="text-3xl font-semibold tracking-tight">{title}</p>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">{detail}</p>
      </div>
    </PhysicalInfoboardViewport>
  );
}