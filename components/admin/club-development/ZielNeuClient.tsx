"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TargetNewPageClient from "@/components/admin/targets/TargetNewPageClient";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { ClubDevelopmentComposerCancelBridge } from "@/components/sce/club-development/ClubDevelopmentComposerCancelBridge";
import {
  SceClubDevelopmentInlineDirtyCloseProvider,
  useOptionalSceClubDevelopmentInlineDirtyClose,
} from "@/components/sce/club-development/SceClubDevelopmentInlineDirtyCloseProvider";
import {
  buildStrategieReturnHref,
  buildZieleReturnHref,
  parseSafeReturnToHref,
} from "@/lib/club-development/vereinsentwicklung-create-routing";
import { buildZielDetailHref } from "@/lib/club-development/vereinsentwicklung-target-task-create-routing";
import VereinsentwicklungFullPageCreatePanel from "./VereinsentwicklungFullPageCreatePanel";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";

export type ZielNeuStrategyOption = { id: string; title: string };

type Props = {
  backHref: string;
  orgUnitId: string | null;
  linkFocus: boolean;
  lockedClubStrategy: { id: string; title: string } | null;
  strategyOptions: ZielNeuStrategyOption[];
};

function ZielNeuClientInner({
  backHref,
  orgUnitId,
  linkFocus,
  lockedClubStrategy,
  strategyOptions,
}: Props) {
  const router = useRouter();
  const inlineDirtyClose = useOptionalSceClubDevelopmentInlineDirtyClose();
  const [selectedStrategyId, setSelectedStrategyId] = useState(
    lockedClubStrategy?.id ?? strategyOptions[0]?.id ?? "",
  );
  const [linkError, setLinkError] = useState<string | null>(null);

  const fallbackBack = lockedClubStrategy
    ? buildStrategieReturnHref({ orgUnitId, strategyId: lockedClubStrategy.id })
    : buildZieleReturnHref({ orgUnitId });

  const navigateBack = useCallback(() => {
    inlineDirtyClose?.requestClose(() => {
      router.push(parseSafeReturnToHref(backHref, fallbackBack));
    });
  }, [backHref, fallbackBack, inlineDirtyClose, router]);

  const effectiveStrategyId = lockedClubStrategy?.id ?? selectedStrategyId.trim();
  const effectiveStrategyTitle =
    lockedClubStrategy?.title ??
    strategyOptions.find((row) => row.id === effectiveStrategyId)?.title ??
    null;

  const shouldLinkFocus = linkFocus || Boolean(lockedClubStrategy?.id);

  async function linkAsSchwerpunkt(targetId: string, clubStrategyId: string) {
    const res = await fetch("/api/club-development/club-strategy/focus-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, clubStrategyId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return typeof data.error === "string"
        ? data.error
        : "Schwerpunkt konnte nicht verknüpft werden.";
    }
    return null;
  }

  const originContext = useMemo(() => {
    if (lockedClubStrategy) {
      return (
        <section
          className="rounded-lg border border-[var(--border)]/80 bg-[var(--surface)]/60 px-3 py-2"
          data-testid="ziel-neu-locked-strategie"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Strategie</p>
          <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{lockedClubStrategy.title}</p>
        </section>
      );
    }
    if (strategyOptions.length === 0) return null;
    return (
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-[var(--muted)]">Strategie (Schwerpunkt)</span>
        <select
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
          value={selectedStrategyId}
          onChange={(e) => setSelectedStrategyId(e.target.value)}
          data-testid="ziel-neu-strategie-picker"
        >
          {strategyOptions.map((row) => (
            <option key={row.id} value={row.id}>
              {row.title}
            </option>
          ))}
        </select>
      </label>
    );
  }, [lockedClubStrategy, selectedStrategyId, strategyOptions]);

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6">
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          {
            label: "Vereinsentwicklung",
            href: lockedClubStrategy
              ? buildStrategieReturnHref({ orgUnitId, strategyId: lockedClubStrategy.id })
              : buildZieleReturnHref({ orgUnitId }),
          },
          { label: "Neues Ziel" },
        ]}
        header={{
          title: "Neues Ziel",
          description: shouldLinkFocus
            ? "Ziel anlegen und mit der gewählten Strategie verknüpfen."
            : "Strategisches Ziel mit messbaren Kennzahlen erfassen.",
          secondaryActions: (
            <button type="button" className="fca-button-secondary text-sm" onClick={navigateBack}>
              Zurück
            </button>
          ),
        }}
        density="dense"
      >
        <div className="mx-auto w-full max-w-3xl" data-testid="ziel-workspace-create">
          <VereinsentwicklungFullPageCreatePanel
            panelTitle="Ziel erstellen"
            panelDomId="ziel-neu-panel"
            cardTestId="ziel-neu-create-card"
            formTestId="ziel-neu-form-wrap"
            error={linkError}
            originContext={originContext}
          >
            <ClubDevelopmentComposerCancelBridge onClose={navigateBack}>
              {(onCancel) => (
                <TargetNewPageClient
                  layout="composer"
                  onCancel={onCancel}
                  onSuccess={async (targetId, meta) => {
                    if (!targetId) return;
                    setLinkError(null);
                    if (shouldLinkFocus && effectiveStrategyId) {
                      const err = await linkAsSchwerpunkt(targetId, effectiveStrategyId);
                      if (err) {
                        setLinkError(
                          `${meta?.title ? `„${meta.title}"` : "Ziel"} gespeichert, aber: ${err}`,
                        );
                        return;
                      }
                    }
                    const detailHref = buildZielDetailHref(targetId, orgUnitId);
                    const destination = lockedClubStrategy
                      ? `${detailHref}${detailHref.includes("?") ? "&" : "?"}created=1`
                      : parseSafeReturnToHref(
                          backHref,
                          buildZieleReturnHref({ orgUnitId }),
                        );
                    router.push(destination);
                    router.refresh();
                  }}
                />
              )}
            </ClubDevelopmentComposerCancelBridge>
          </VereinsentwicklungFullPageCreatePanel>
          {effectiveStrategyTitle ? (
            <p className="sr-only" data-testid="ziel-neu-effective-strategie">
              {effectiveStrategyTitle}
            </p>
          ) : null}
          {linkError ? (
            <div className="mt-3">
              <ClubDevelopmentFormError message={linkError} />
            </div>
          ) : null}
        </div>
      </SceWorkspaceChrome>
    </div>
  );
}

export default function ZielNeuClient(props: Props) {
  return (
    <SceClubDevelopmentInlineDirtyCloseProvider>
      <ZielNeuClientInner {...props} />
    </SceClubDevelopmentInlineDirtyCloseProvider>
  );
}