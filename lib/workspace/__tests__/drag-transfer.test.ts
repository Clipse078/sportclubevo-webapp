import { describe, expect, it } from "vitest";

import {
  WORKSPACE_INTERNAL_DRAG_MIME,
  isExternalFileDrag,
  readInternalDragPayload,
  writeInternalDragPayload,
} from "@/lib/workspace/drag-transfer";
import { uploadWorkspaceFile } from "@/lib/workspace/upload-client";

describe("WORKSPACE-03 drag transfer", () => {
  it("W03-23 external file drag is recognized", () => {
    const dt = {
      types: ["Files"],
      getData: () => "",
    } as unknown as DataTransfer;
    expect(isExternalFileDrag(dt)).toBe(true);
  });

  it("W03-24 internal workspace drag is not external upload", () => {
    const dt = {
      types: [WORKSPACE_INTERNAL_DRAG_MIME, "Files"],
      getData: (type: string) =>
        type === WORKSPACE_INTERNAL_DRAG_MIME
          ? JSON.stringify({ kind: "FOLDER", folderId: "f1", folderName: "A" })
          : "",
    } as unknown as DataTransfer;
    expect(isExternalFileDrag(dt)).toBe(false);
  });

  it("W03-26 authorized external upload uses canonical upload client export", () => {
    expect(typeof uploadWorkspaceFile).toBe("function");
  });

  it("W03-28 internal folder payload roundtrip", () => {
    const dt = {
      types: [] as string[],
      data: {} as Record<string, string>,
      setData(type: string, value: string) {
        this.types.push(type);
        this.data[type] = value;
      },
      getData(type: string) {
        return this.data[type] ?? "";
      },
    } as unknown as DataTransfer;

    writeInternalDragPayload(dt, {
      kind: "FOLDER",
      folderId: "folder-1",
      folderName: "Sportleitung",
    });

    expect(readInternalDragPayload(dt)?.folderId).toBe("folder-1");
  });
});
