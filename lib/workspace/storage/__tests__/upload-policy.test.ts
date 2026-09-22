import { describe, expect, it } from "vitest";

import {
  assertAllowedWorkspaceUploadExtension,
  isBlockedWorkspaceUploadExtension,
  MAX_WORKSPACE_FILE_SIZE_BYTES,
} from "@/lib/workspace/storage/upload-policy";
import { TeamDocumentValidationError } from "@/lib/teams/team-document-validation";

describe("upload-policy", () => {
  it("W04-21 blocks dangerous extensions", () => {
    expect(isBlockedWorkspaceUploadExtension("malware.exe")).toBe(true);
    expect(() =>
      assertAllowedWorkspaceUploadExtension("script.ps1"),
    ).toThrow(TeamDocumentValidationError);
  });

  it("W04-23 allows Unicode filenames with safe extensions", () => {
    expect(
      isBlockedWorkspaceUploadExtension("Jahresbericht_Zürich_2026.pdf"),
    ).toBe(false);
  });

  it("W04-20 enforces explicit max upload size constant", () => {
    expect(MAX_WORKSPACE_FILE_SIZE_BYTES).toBe(100 * 1024 * 1024);
  });
});
