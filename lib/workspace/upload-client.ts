/**
 * Structured upload error that carries the server-side error code for
 * reliable client-side message mapping.
 */
export class WorkspaceUploadError extends Error {
  readonly code: string | undefined;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "WorkspaceUploadError";
    this.code = code;
  }
}

export type WorkspaceUploadedDocumentInfo = {
  id: string;
  name: string;
};

export type WorkspaceUploadResponse = {
  document?: WorkspaceUploadedDocumentInfo;
  error?: string;
  code?: string;
};

type UploadWorkspaceFileInput = {
  file: File;
  folderId: string;
};

async function readUploadResponse(
  response: Response,
): Promise<WorkspaceUploadResponse> {
  try {
    return (await response.json()) as WorkspaceUploadResponse;
  } catch {
    return {};
  }
}

export async function uploadWorkspaceFile({
  file,
  folderId,
}: UploadWorkspaceFileInput): Promise<WorkspaceUploadResponse> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("folderId", folderId);

  const response = await fetch("/api/workspace/documents", {
    method: "POST",
    body: formData,
  });

  const result = await readUploadResponse(response);

  if (!response.ok) {
    throw new WorkspaceUploadError(
      result.error ||
        `Upload failed with status ${response.status}.`,
      result.code,
    );
  }

  return result;
}

type UploadWorkspaceDocumentVersionInput = {
  documentId: string;
  file: File;
  changeNote?: string | null;
};

export async function uploadWorkspaceDocumentVersion({
  documentId,
  file,
  changeNote,
}: UploadWorkspaceDocumentVersionInput): Promise<WorkspaceUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  if (changeNote?.trim()) {
    formData.append("changeNote", changeNote.trim());
  }

  const response = await fetch(
    `/api/workspace/documents/${encodeURIComponent(documentId)}/versions`,
    {
      method: "POST",
      body: formData,
    },
  );

  const result = await readUploadResponse(response);

  if (!response.ok) {
    throw new WorkspaceUploadError(
      result.error ||
        `Version upload failed with status ${response.status}.`,
      result.code,
    );
  }

  return result;
}
