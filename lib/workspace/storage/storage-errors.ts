/**
 * WORKSPACE-08-06 — provider-neutral storage error taxonomy.
 */

export type WorkspaceStorageErrorClass =
  | "NOT_FOUND"
  | "AUTHENTICATION_FAILED"
  | "ACCESS_DENIED"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_CONFIGURATION"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "INVALID_INPUT"
  | "UNKNOWN";

export class WorkspaceStorageOperationError extends Error {
  readonly errorClass: WorkspaceStorageErrorClass;

  constructor(errorClass: WorkspaceStorageErrorClass, message: string) {
    super(message);
    this.name = "WorkspaceStorageOperationError";
    this.errorClass = errorClass;
  }
}

export function isWorkspaceStorageNotFoundError(
  error: unknown,
): boolean {
  return (
    error instanceof WorkspaceStorageOperationError &&
    error.errorClass === "NOT_FOUND"
  );
}
