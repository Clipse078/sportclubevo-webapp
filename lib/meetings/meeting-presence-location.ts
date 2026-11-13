/**
 * SCE-MTG-ONLINE-01 — meeting presence encoding in existing `Meeting.location`
 * until dedicated columns land (see docs/roadmap/SCE-MTG-ONLINE-01.md).
 */

export type MeetingPresenceFormat = "ONSITE" | "ONLINE" | "HYBRID";

export type MeetingPresenceFields = {
  format: MeetingPresenceFormat;
  onsiteLabel: string | null;
  onlineUrl: string | null;
};

const PRESENCE_MARKER = "[[sce-mtg-presence:v1]]";

const HTTPS_URL_PATTERN = /^https:\/\/.+/i;

export function validateMeetingOnlineUrl(value: string): boolean {
  return HTTPS_URL_PATTERN.test(value.trim());
}

export function serializeMeetingLocation(fields: MeetingPresenceFields): string | null {
  const onsite = fields.onsiteLabel?.trim() || null;
  const online = fields.onlineUrl?.trim() || null;

  if (fields.format === "ONSITE") {
    return onsite;
  }
  if (fields.format === "ONLINE") {
    return online;
  }
  if (!onsite && !online) {
    return null;
  }
  const payload = JSON.stringify({ onsite, onlineUrl: online });
  const prefix = onsite ?? "—";
  return `${prefix}${PRESENCE_MARKER}${payload}`;
}

export function parseMeetingLocation(raw: string | null | undefined): MeetingPresenceFields {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return { format: "ONSITE", onsiteLabel: null, onlineUrl: null };
  }

  const markerIndex = trimmed.indexOf(PRESENCE_MARKER);
  if (markerIndex >= 0) {
    const payloadRaw = trimmed.slice(markerIndex + PRESENCE_MARKER.length);
    try {
      const parsed = JSON.parse(payloadRaw) as { onsite?: string | null; onlineUrl?: string | null };
      return {
        format: "HYBRID",
        onsiteLabel: typeof parsed.onsite === "string" ? parsed.onsite : null,
        onlineUrl: typeof parsed.onlineUrl === "string" ? parsed.onlineUrl : null,
      };
    } catch {
      return { format: "HYBRID", onsiteLabel: trimmed.slice(0, markerIndex).trim() || null, onlineUrl: null };
    }
  }

  if (validateMeetingOnlineUrl(trimmed)) {
    return { format: "ONLINE", onsiteLabel: null, onlineUrl: trimmed };
  }

  return { format: "ONSITE", onsiteLabel: trimmed, onlineUrl: null };
}

export function formatMeetingPresenceLabel(fields: MeetingPresenceFields): string {
  if (fields.format === "ONLINE") {
    return fields.onlineUrl ? "Online" : "Online (Link fehlt)";
  }
  if (fields.format === "HYBRID") {
    const onsite = fields.onsiteLabel?.trim();
    return onsite ? `${onsite} · Hybrid` : "Hybrid";
  }
  return fields.onsiteLabel?.trim() || "Kein Ort angegeben";
}
