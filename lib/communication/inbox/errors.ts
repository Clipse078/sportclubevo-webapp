export class CommunicationCenterError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CommunicationCenterError";
  }
}
