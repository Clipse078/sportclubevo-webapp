"use client";

import { useRouter } from "next/navigation";
import InitiativeForm from "@/components/admin/initiatives/InitiativeForm";
import { SceClubDevelopmentComposerShell } from "@/components/sce/club-development/SceClubDevelopmentComposerShell";
import { ClubDevelopmentComposerCancelBridge } from "@/components/sce/club-development/ClubDevelopmentComposerCancelBridge";
import { CD_TARGET_COPY } from "@/lib/club-development/product-copy";

type ContextualLinkProps = {
  targetId: string;
  onFinished: (payload: {
    initiative: { id: string; slug: string; title: string };
    linkOk: boolean;
    linkError?: string;
  }) => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  preselectedTarget?: { id: string; title: string } | null;
  contextualLink?: ContextualLinkProps;
};

export default function CreateInitiativeComposerDialog({
  open,
  onClose,
  preselectedTarget = null,
  contextualLink,
}: Props) {
  const router = useRouter();
  const contextual = Boolean(contextualLink);

  async function linkToTarget(initiative: { id: string; slug: string; title: string }) {
    if (!contextualLink) return { linkOk: true as const };
    const res = await fetch(
      `/api/club-development/targets/${contextualLink.targetId}/initiative-links`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initiativeId: initiative.id }),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        linkOk: false as const,
        linkError: typeof data.error === "string" ? data.error : "Verknüpfung fehlgeschlagen.",
      };
    }
    return { linkOk: true as const };
  }

  return (
    <SceClubDevelopmentComposerShell
      open={open}
      onClose={onClose}
      title="Neues Vorhaben"
      description={
        preselectedTarget
          ? `${CD_TARGET_COPY.preselectedTargetLabel}: ${preselectedTarget.title}`
          : "Vorhaben im Workspace erfassen — ohne die Übersicht zu verlassen."
      }
      testId="create-initiative-composer"
    >
      <ClubDevelopmentComposerCancelBridge onClose={onClose}>
        {(onCancel) => (
          <InitiativeForm
            mode="create"
            layout="composer"
            onCancel={onCancel}
            preselectedTargetTitle={preselectedTarget?.title ?? null}
            onSuccess={async (initiative) => {
              if (contextual && contextualLink) {
                const linkResult = await linkToTarget(initiative);
                contextualLink.onFinished({
                  initiative,
                  linkOk: linkResult.linkOk,
                  linkError: linkResult.linkOk ? undefined : linkResult.linkError,
                });
                return;
              }
              onClose();
              router.push(
                initiative.slug
                  ? `/vereinsleitung/initiativen/${initiative.slug}`
                  : "/vereinsleitung/initiativen?status=saved",
              );
              router.refresh();
            }}
          />
        )}
      </ClubDevelopmentComposerCancelBridge>
    </SceClubDevelopmentComposerShell>
  );
}