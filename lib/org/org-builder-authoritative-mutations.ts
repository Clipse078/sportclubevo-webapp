/**
 * Client-side authoritative OrgUnit mutations for Organisation Builder undo/redo.
 */

export type OrgUnitReparentPayload = {
  unitId: string;
  parentId: string | null;
};

export type OrgUnitCreatePayload = {
  name: string;
  key?: string;
  type: string;
  parentId: string | null;
  description?: string | null;
  status?: string;
};

export type OrgUnitEditPayload = {
  unitId: string;
  body: Record<string, unknown>;
};

export async function orgBuilderPutOrgUnit(
  unitId: string,
  body: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/org-units/${unitId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: typeof data?.error === "string" ? data.error : "Aktion fehlgeschlagen." };
  }
  return { ok: true };
}

export async function orgBuilderCreateOrgUnit(
  payload: OrgUnitCreatePayload,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const res = await fetch("/api/org-units", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: typeof data?.error === "string" ? data.error : "Erstellen fehlgeschlagen.",
    };
  }
  const id = typeof data?.orgUnit?.id === "string" ? data.orgUnit.id : "";
  if (!id) return { ok: false, error: "Erstellen fehlgeschlagen." };
  return { ok: true, id };
}

export async function orgBuilderTryDeleteCreatedUnit(
  orgUnitId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const preview = await fetch(`/api/org-units/${encodeURIComponent(orgUnitId)}/permanent`, {
    method: "DELETE",
  });
  const previewData = await preview.json().catch(() => null);
  if (!preview.ok) {
    return {
      ok: false,
      error:
        typeof previewData?.error === "string"
          ? previewData.error
          : "Rückgängig machen ist nicht mehr möglich.",
    };
  }
  const impact = previewData?.impact as
    | {
        childOrgUnits?: number;
        teamSeasonLinks?: number;
        orgUnitMemberships?: number;
        personAssignments?: number;
        scopedUserRoles?: number;
        legacyTeamLinks?: number;
      }
    | undefined;

  const blocked =
    (impact?.childOrgUnits ?? 0) > 0 ||
    (impact?.teamSeasonLinks ?? 0) > 0 ||
    (impact?.orgUnitMemberships ?? 0) > 0 ||
    (impact?.personAssignments ?? 0) > 0 ||
    (impact?.scopedUserRoles ?? 0) > 0 ||
    (impact?.legacyTeamLinks ?? 0) > 0;

  if (blocked) {
    return {
      ok: false,
      error:
        "Diese Einheit hat inzwischen Abhängigkeiten — Rückgängig machen ist nicht mehr möglich.",
    };
  }

  const res = await fetch(
    `/api/org-units/${encodeURIComponent(orgUnitId)}/permanent?confirm=true`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: typeof data?.error === "string" ? data.error : "Löschen fehlgeschlagen.",
    };
  }
  return { ok: true };
}
