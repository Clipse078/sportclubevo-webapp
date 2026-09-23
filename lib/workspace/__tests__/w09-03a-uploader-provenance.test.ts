import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("WORKSPACE-09-03A uploader provenance", () => {
  it("W09-03A-01 version service resolves per-version uploader display names", () => {
    const svc = read("lib/workspace/document-version-service.ts");
    expect(svc).toMatch(/resolveWorkspaceVersionUploaderDisplayNames/);
    expect(svc).toMatch(/createdByName:\s*\n?\s*version\.createdByUserId/);
  });

  it("W09-03A-02 versions API serializes public uploader DTO without user ids", () => {
    const route = read(
      "app/api/workspace/documents/[documentId]/versions/route.ts",
    );
    expect(route).toMatch(/serializeWorkspaceDocumentVersionHistoryPublicItem/);
    const publicDto = read("lib/workspace/document-version-history-public-dto.ts");
    expect(publicDto).toMatch(/uploader: WorkspaceVersionUploaderPublicDto/);
    expect(publicDto).not.toMatch(/createdByUserId/);
  });

  it("W09-03A-03 inspector Details surfaces Hochgeladen von/am for current version", () => {
    const view = read(
      "components/admin/workspace/inspector/WorkspaceDocumentInspectorView.tsx",
    );
    expect(view).toMatch(/Hochgeladen von/);
    expect(view).toMatch(/Hochgeladen am/);
    expect(view).toMatch(/currentVersion\?\.uploader\.displayName/);
  });

  it("W09-03A-04 version history dialog renders uploader metadata per row", () => {
    const dialog = read(
      "components/admin/workspace/WorkspaceDocumentVersionHistoryDialog.tsx",
    );
    expect(dialog).toMatch(/uploader\.displayName/);
    expect(dialog).not.toMatch(/createdByUserId/);
  });

  it("W09-03A-05 append and restore write services persist actor on new immutable version", () => {
    const write = read("lib/workspace/document-version-write-service.ts");
    expect(write).toMatch(/createdByUserId: actorUserId/);
    expect(write).toMatch(/DOCUMENT_VERSION_RESTORED/);
  });

  it("W09-03A-06 initial document upload sets v1 createdByUserId to actor", () => {
    const create = read("lib/workspace/document-service.ts");
    expect(create).toMatch(/createdByUserId: actorUserId/);
  });

  it("W09-03A-07 resolver is tenant-scoped and avoids email exposure", () => {
    const resolver = read(
      "lib/workspace/version/resolve-workspace-version-uploader-display.ts",
    );
    expect(resolver).toMatch(/tenantId/);
    expect(resolver).not.toMatch(/email:\s*true/);
    expect(resolver).not.toMatch(/Person\.id/);
  });

  it("W09-03A-08 exact Task/Requirement references are not retargeted on append/restore", () => {
    const write = read("lib/workspace/document-version-write-service.ts");
    expect(write).not.toMatch(/taskDocumentReference/);
    expect(write).not.toMatch(/requirementWorkspaceDocumentVersionReference/);
    const restore = read("lib/workspace/document-restore-service.ts");
    expect(restore).not.toMatch(/workspaceDocumentVersionId/);
  });
});
