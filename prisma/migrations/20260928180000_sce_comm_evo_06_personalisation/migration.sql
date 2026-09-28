-- SCE-COMM-EVO-06 — frozen per-recipient personalised content at dispatch.

ALTER TABLE "PlatformCommunicationRecipientSnapshot"
  ADD COLUMN "renderedSubject" TEXT,
  ADD COLUMN "renderedBodyText" TEXT,
  ADD COLUMN "personalisationDiagnosticsJson" JSONB;
