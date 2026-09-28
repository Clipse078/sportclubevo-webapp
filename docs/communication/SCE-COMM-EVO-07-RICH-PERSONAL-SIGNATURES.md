# SCE-COMM-EVO-07 — Rich Personal Signatures

## Ownership

- Personal signatures remain **tenant + user** scoped (`UserCommunicationPersonalSignature`).
- Independent from `TenantCommunicationSenderIdentity` (EVO-08), campaigns, templates, and target groups.

## Structured format

- Canonical source: `contentJson` (`PersonalSignatureContent`, TipTap-compatible subset).
- `bodyText` is a deterministic **plain-text fallback** (legacy + email text part).
- `contentVersion` increments when structured content changes (asset versioning seam).

Supported blocks: paragraph, hard break, horizontal rule, `signatureImage`.  
Marks: bold, italic, link (`http(s)://`, `mailto:`, `tel:`).

## Sanitization

- Server validation via `sanitizePersonalSignatureContent` — no arbitrary HTML storage.
- Links and images validated; unsupported nodes rejected.

## Images / EVO-04 storage

- Logos uploaded to private `CommunicationAttachment` rows (`sourceType: PERSONAL_SIGNATURE`).
- Signature-specific limit: **512 KiB** (`validatePersonalSignatureImage`).
- Allowed: PNG, JPEG, WEBP, GIF (magic-byte validated). SVG not allowed.

## Email (COMM-14) — CID delivery

- HTML uses `cid:sce-personal-signature-{cidKey}@sportclubevo.local`.
- Bytes loaded at delivery from private storage (`loadSignatureCidMailAttachments`).
- Inline disposition; not shown as normal downloadable attachment.

## IN_APP rendering

- `signatureContentToInAppHtml` uses authenticated attachment download URLs (not CID).

## Push

- Unchanged: text preview only; images omitted via plain-text fallback.

## Personalisation (EVO-06)

- Tokens in signature plain text participate in the same engine as message body.
- Publish renders message and signature parts separately for `renderedBodyHtml` per recipient snapshot.

## Composer integration

- Direct Message, Mitteilungen (`MESSAGE` kind), Communication Center reply — unchanged toggles.
- Campaigns / org broadcasts: signatures remain excluded per UX-08A rules.

## Historical freezing

- `PlatformCommunication.personalSignatureFreezeJson` at publish/send.
- `CommunicationCenterMessage.personalSignatureFreezeJson` for inbox replies.
- `PlatformCommunicationRecipientSnapshot.renderedBodyHtml` for email history.
- Later signature edits do not alter sent content.

## Asset retention

- `UserCommunicationPersonalSignatureAsset` links signature versions to attachment rows.
- Attachments are not overwritten in place; replacement creates new attachment IDs.

## Limits

| Limit | Value |
|-------|------|
| Plain text | 2000 chars |
| Images | 2 |
| Links | 8 |
| Nodes | 120 |
| Logo size | 512 KiB |

## Billing boundary

- Invoice / billing email transport unchanged (Infomaniak). No personal signature injection.

## Cleanup (EVO-09 seam)

- Orphan signature attachments follow future EVO-04/EVO-09 orphan policy; historical freezes retain references.

## Mobile / a11y

- Toolbar wraps on narrow screens; controls have `aria-label`s.
- Logo upload requires alt text.
