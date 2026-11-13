# SCE-MTG-ONLINE-01 — Onsite / online / hybrid meetings

**Status:** Interim implementation in `lib/meetings/meeting-presence-location.ts` (no migration).  
**Future migration:** `MeetingPresenceFormat format`, `onlineMeetingUrl String?`, keep `location` for onsite label.

## Scope delivered without migration

- Encode **ONSITE / ONLINE / HYBRID** in existing `Meeting.location` (marker payload for hybrid; raw HTTPS for online-only).
- Manual **HTTPS** link entry; no conferencing integrations, embeds, or recordings.
- UI wiring: `MeetingForm`, workspace header/details (follow-up PR can extend print view).

## Migration proposal (PO approval required)

```prisma
enum MeetingPresenceFormat {
  ONSITE
  ONLINE
  HYBRID
}

model Meeting {
  presenceFormat MeetingPresenceFormat @default(ONSITE)
  onlineMeetingUrl String?
  // location remains onsite label
}
```

One-time backfill from `parseMeetingLocation(location)` during deploy.
