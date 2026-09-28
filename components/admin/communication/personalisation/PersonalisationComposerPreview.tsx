"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import {
  buildCommunicationAudienceSpec,
  communicationAudienceSelectionIsEmpty,
  type CommunicationAudienceSelection,
} from "@/lib/communication/audience/communication-audience-selection";
import { PersonalisationPreviewPanel } from "@/components/admin/communication/personalisation/PersonalisationPreviewPanel";

type PreviewContextParam = "DIRECT" | "ORGANISATION" | "CAMPAIGN";

type Props = {
  subject: string;
  bodyText: string;
  contextRef: CommunicationContextRef;
  audienceSelection: CommunicationAudienceSelection;
  audienceContext: PreviewContextParam;
  previewKind?: string;
  communicationKind?: string;
};

export function PersonalisationComposerPreview({
  subject,
  bodyText,
  contextRef,
  audienceSelection,
  audienceContext,
  previewKind,
  communicationKind,
}: Props) {
  const audience = useMemo(
    () => buildCommunicationAudienceSpec(audienceSelection),
    [audienceSelection],
  );
  const [recipients, setRecipients] = useState<{ personId: string; displayName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hasAudience = !communicationAudienceSelectionIsEmpty(audienceSelection);
  const canLoad = hasAudience && bodyText.trim().length > 0;

  const loadRecipients = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/communication/audience/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audienceSpec: audience,
          context: audienceContext,
          kind: previewKind,
          includeRecipientDetail: true,
        }),
      });
      const data = (await res.json()) as {
        recipients?: { personId: string; displayName: string }[];
        error?: string;
      };
      if (!res.ok) {
        setRecipients([]);
        setLoadError(data.error ?? "Empfängervorschau nicht verfügbar");
        return;
      }
      setRecipients(data.recipients ?? []);
    } catch {
      setRecipients([]);
      setLoadError("Empfängervorschau nicht verfügbar");
    } finally {
      setLoading(false);
    }
  }, [audience, audienceContext, previewKind]);

  useEffect(() => {
    if (!canLoad) return undefined;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void loadRecipients().then(() => {
        if (cancelled) return;
      });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [canLoad, loadRecipients]);

  if (!bodyText.trim()) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        Geben Sie eine Nachricht ein, um die Personalisierungsvorschau zu nutzen.
      </p>
    );
  }

  if (!hasAudience) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        Wählen Sie Empfänger, um eine personalisierte Vorschau zu sehen.
      </p>
    );
  }

  if (loading && recipients.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">Empfänger für Vorschau werden geladen…</p>;
  }

  if (loadError) {
    return <p className="text-sm text-amber-700">{loadError}</p>;
  }

  if (recipients.length === 0) {
    return (
      <p className="text-sm text-amber-700">
        Für diese Empfängerauswahl stehen keine Personen für die Vorschau zur Verfügung.
      </p>
    );
  }

  return (
    <PersonalisationPreviewPanel
      subject={subject}
      bodyText={bodyText}
      contextRef={contextRef}
      audience={audience as CommunicationAudienceSpec}
      recipients={recipients}
      communicationKind={communicationKind}
    />
  );
}
