"use client";

import { useRouter } from "next/navigation";
import TargetNewPageClient from "@/components/admin/targets/TargetNewPageClient";
import { SceClubDevelopmentComposerShell } from "@/components/sce/club-development/SceClubDevelopmentComposerShell";
import { ClubDevelopmentComposerCancelBridge } from "@/components/sce/club-development/ClubDevelopmentComposerCancelBridge";
type ContextualFocusProps = {
  onFinished: (payload: { targetId: string; linkOk: boolean; linkError?: string; title?: string }) => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  contextualFocus?: ContextualFocusProps;
};

export default function CreateTargetComposerDialog({
  open,
  onClose,
  contextualFocus,
}: Props) {
  const router = useRouter();
  const contextual = Boolean(contextualFocus);

  async function linkAsSchwerpunkt(targetId: string) {
    if (!contextualFocus) return { linkOk: true as const };
    const res = await fetch("/api/club-development/club-strategy/focus-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        linkOk: false as const,
        linkError: typeof data.error === "string" ? data.error : "Schwerpunkt konnte nicht verknüpft werden.",
      };
    }
    return { linkOk: true as const };
  }

  return (
    <SceClubDevelopmentComposerShell
      open={open}
      onClose={onClose}
      title="Neues Ziel"
      description={
        contextual
          ? "Ziel wird als Schwerpunkt mit der Strategie verknüpft — Freigabe bleibt unverändert."
          : "Strategisches Ziel mit Kennzahlen — Vorlagen optional im Composer."
      }
      testId="create-target-composer"
    >
      <ClubDevelopmentComposerCancelBridge onClose={onClose}>
        {(onCancel) => (
          <TargetNewPageClient
            layout="composer"
            onCancel={onCancel}
            onSuccess={async (id, meta) => {
              if (contextual && contextualFocus && id) {
                const linkResult = await linkAsSchwerpunkt(id);
                contextualFocus.onFinished({
                  targetId: id,
                  title: meta?.title,
                  linkOk: linkResult.linkOk,
                  linkError: linkResult.linkOk ? undefined : linkResult.linkError,
                });
                return;
              }
              onClose();
              router.push(
                id ? `/vereinsleitung/targets/${id}?status=saved` : "/vereinsleitung/targets?status=saved",
              );
              router.refresh();
            }}
          />
        )}
      </ClubDevelopmentComposerCancelBridge>
    </SceClubDevelopmentComposerShell>
  );
}