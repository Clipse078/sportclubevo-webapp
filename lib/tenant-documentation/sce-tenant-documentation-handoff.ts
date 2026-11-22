/**
 * PR #1025 — Dokumentation Ready URLs (commit-bound `dpl` on STAGE-backed preview).
 */

export const TENANT_DOCUMENTATION_PULL_REQUEST = 1025 as const;

/** STAGE-backed PR #1025 preview origin (Vercel Git branch deployment). */
export const TENANT_DOCUMENTATION_PREVIEW_ORIGIN =
  "https://sportclubevo-webapp-stage-git-curs-51a1ef-mds-projects-462da62c.vercel.app" as const;

export const TENANT_DOCUMENTATION_HUB_PATH = "/dashboard/dokumentation" as const;

export function tenantDocumentationPagePath(pageId: string): string {
  return `/dashboard/dokumentation/p/${encodeURIComponent(pageId)}`;
}

export function tenantDocumentationVersionPath(pageId: string, versionId: string): string {
  return `/dashboard/dokumentation/p/${encodeURIComponent(pageId)}/v/${encodeURIComponent(versionId)}`;
}

export const TENANT_DOCUMENTATION_PAPIERKORB_PATH = "/dashboard/dokumentation/papierkorb" as const;

export function buildTenantDocumentationPreviewUrl(
  previewBase: string,
  commitSha: string,
  path: string = TENANT_DOCUMENTATION_HUB_PATH,
): string {
  const base = previewBase.replace(/\/$/, "");
  const shortSha = commitSha.slice(0, 12);
  const separator = path.includes("?") ? "&" : "?";
  return `${base}${path}${separator}dpl=${shortSha}`;
}

export function buildTenantDocumentationHandoffUrls(
  previewBase: string,
  commitSha: string,
  samplePageId?: string | null,
) {
  return {
    commitSha,
    dpl: commitSha.slice(0, 12),
    dokumentationHub: buildTenantDocumentationPreviewUrl(
      previewBase,
      commitSha,
      TENANT_DOCUMENTATION_HUB_PATH,
    ),
    samplePage: samplePageId
      ? buildTenantDocumentationPreviewUrl(
          previewBase,
          commitSha,
          tenantDocumentationPagePath(samplePageId),
        )
      : null,
  };
}