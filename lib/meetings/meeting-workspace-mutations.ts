/**
 * Client-side meeting sub-entity API helpers (Meetings 2.0 workspace).
 * Thin wrappers around existing REST routes — no duplicate persistence.
 */

export class MeetingWorkspaceApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly payload: Record<string, unknown>;

  constructor(message: string, status: number, payload: Record<string, unknown> = {}) {
    super(message);
    this.name = "MeetingWorkspaceApiError";
    this.status = status;
    this.payload = payload;
    this.code = typeof payload.code === "string" ? payload.code : undefined;
  }
}

export async function postJson<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new MeetingWorkspaceApiError(
      typeof data.error === "string" ? data.error : "Anfrage fehlgeschlagen.",
      res.status,
      data,
    );
  }
  return data as T;
}

async function deleteWithOptionalConfirm<T>(baseUrl: string, confirm: boolean): Promise<T> {
  const url = confirm ? `${baseUrl}?confirm=true` : baseUrl;
  const res = await fetch(url, { method: "DELETE" });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new MeetingWorkspaceApiError(
      typeof data.error === "string" ? data.error : "Anfrage fehlgeschlagen.",
      res.status,
      data,
    );
  }
  return data as T;
}

export const meetingWorkspaceApi = {
  agenda: {
    create: (meetingId: string, body: Record<string, unknown>) =>
      postJson<{ item: { id: string } }>(`/api/meetings/${meetingId}/agenda`, "POST", body),
    update: (meetingId: string, itemId: string, body: Record<string, unknown>) =>
      postJson(`/api/meetings/${meetingId}/agenda/${itemId}`, "PATCH", body),
    remove: (meetingId: string, itemId: string) =>
      postJson(`/api/meetings/${meetingId}/agenda/${itemId}`, "DELETE"),
  },
  participants: {
    create: (meetingId: string, body: Record<string, unknown>) =>
      postJson<{ participant: { id: string } }>(`/api/meetings/${meetingId}/participants`, "POST", body),
    update: (meetingId: string, participantId: string, body: Record<string, unknown>) =>
      postJson(`/api/meetings/${meetingId}/participants/${participantId}`, "PATCH", body),
    remove: (meetingId: string, participantId: string) =>
      postJson(`/api/meetings/${meetingId}/participants/${participantId}`, "DELETE"),
  },
  decisions: {
    create: (meetingId: string, body: Record<string, unknown>) =>
      postJson<{ decision: { id: string } }>(`/api/meetings/${meetingId}/decisions`, "POST", body),
    update: (meetingId: string, decisionId: string, body: Record<string, unknown>) =>
      postJson(`/api/meetings/${meetingId}/decisions/${decisionId}`, "PATCH", body),
    previewRemove: (meetingId: string, decisionId: string) =>
      deleteWithOptionalConfirm<{
        title: string;
        impact: { linkedPendenzCount: number; linkedTaskCount: number };
        requiresConfirmation: true;
      }>(`/api/meetings/${meetingId}/decisions/${decisionId}`, false),
    remove: (meetingId: string, decisionId: string) =>
      deleteWithOptionalConfirm<{ message: string; title: string }>(
        `/api/meetings/${meetingId}/decisions/${decisionId}`,
        true,
      ),
  },
  actions: {
    create: (meetingId: string, body: Record<string, unknown>) =>
      postJson<{ action: { id: string } }>(`/api/meetings/${meetingId}/actions`, "POST", body),
    update: (meetingId: string, actionId: string, body: Record<string, unknown>) =>
      postJson(`/api/meetings/${meetingId}/actions/${actionId}`, "PATCH", body),
    previewRemove: (meetingId: string, actionId: string) =>
      deleteWithOptionalConfirm<{
        title: string;
        impact: { linkedDecisionId: string | null; linkedDecisionTitle: string | null };
        requiresConfirmation: true;
      }>(`/api/meetings/${meetingId}/actions/${actionId}`, false),
    remove: (meetingId: string, actionId: string) =>
      deleteWithOptionalConfirm<{ message: string; title: string }>(
        `/api/meetings/${meetingId}/actions/${actionId}`,
        true,
      ),
  },
};
