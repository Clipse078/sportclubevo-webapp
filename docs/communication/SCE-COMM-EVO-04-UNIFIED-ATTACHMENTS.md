# SCE-COMM-EVO-04 — Unified Private Communication Attachments

**Branch:** `cursor/comm-evo-04-unified-attachments`  
**Base:** `cursor/comm-evo-02-inbox-reliability-messaging`  
**Parent:** SCE-COMM-EVO-02 (#753)

## Canonical owner

- **`CommunicationAttachment`** — tenant-scoped metadata; bytes in private Workspace blob storage via `lib/communication/attachment-storage.ts`.
- Links:
  - `CommunicationMessageAttachment` — registration / legacy email threads
  - `CommunicationCenterMessageAttachment` — Kommunikationscenter (IMAP + SCE + replies)
  - `PlatformCommunicationAttachment` — Mitteilungen, Kampagnen, direct message fan-out

No second blob system. No public blob URLs. No attachment bytes in Prisma.

## Upload lifecycle

1. Client selects file (shared `CommunicationAttachmentPicker` / `EmailAttachmentComposer`).
2. Client-side size/type hints (10 MiB per file, 10 files, 20 MiB total — `attachment-constants.ts`).
3. `POST /api/communication/attachments` (or tenant registrations route for legacy panel).
4. Server validation (`attachment-validation.ts`: extension + declared MIME + magic bytes).
5. Private upload + `CommunicationAttachment` row (`lifecycleStatus: READY`, `scanStatus: PENDING`).
6. On send/publish: `validateOutboundAttachmentSelection` + ownership checks (`attachment-authorization.ts`).
7. Link to message/platform communication; historical metadata frozen via immutable link + stored filename/size.

Orphan uploads remain unlinked until send; cross-user / cross-draft reuse is rejected at validation.

## Authorization

- Download/preview: `authorizeCommunicationAttachmentAccess` — tenant membership + path-specific access:
  - Registration thread messages — registrations permissions
  - Center messages — inbox view; SCE threads require participant
  - Platform communications — published recipient snapshot, club/team view/send, or draft owner
- Routes:
  - `GET /api/communication/attachments/[attachmentId]/download` (`?disposition=inline` for preview-eligible types)
  - Legacy tenant registrations download remains for COMM-02 threads

Never returned to clients: `storageKey`, private blob URLs, scan internals.

## MIME / size policy

Allowlist in `attachment-validation.ts`: PDF, DOCX, XLSX, PPTX, TXT, CSV, JPEG, PNG, WEBP, GIF.  
Blocked: executables and dangerous extensions (`.exe`, `.bat`, `.cmd`, `.js`, etc.).  
Preview allowlist reuses Workspace policy (`attachment-preview-policy.ts`): images + PDF only.

## Inbound IMAP (COMM-15)

- Parsed in `mail-parser.ts`; persisted via `inbound-attachment-persistence.ts` with real private storage + `READY`.
- Legacy rows with `communication-center/inbound/…` placeholder keys show **„Datei nicht verfügbar“** (no broken links).
- Inline MIME parts (`related: true`) remain excluded from attachment list; body HTML sanitization unchanged.

## Outbound

- **Direct message:** platform + mirrored center message links; shared blob across fan-out.
- **Mitteilungen / Kampagnen:** `PlatformCommunicationAttachment`; email via `loadPlatformCommunicationAttachmentsForDelivery` in COMM-14 processor.
- **Center reply:** center message links + transport attachments; idempotency/threading preserved.

## Malware scanning truth

`scanStatus: PENDING` means validated upload, **not** malware-clean. No scanner integrated in EVO-04. UI does not claim scanned files. QUARANTINED/FAILED block download and send.

## Boundaries (deferred)

- **EVO-06:** template attachment defaults / merge fields
- **EVO-07:** signature logos (will reuse this attachment primitive)
- **EVO-08:** multi-sender selection
- **EVO-03 / EVO-05:** audience / Zielgruppen redesign
- **EVO-09:** optional orphan cleanup cron for abandoned uploads

## Failure semantics (German product copy)

Distinct messages for: upload failed, type rejected, too large, send failed, attachment unavailable, unauthorized download, email attachment load failure (delivery attempt `ATTACHMENT_UNAVAILABLE`).
