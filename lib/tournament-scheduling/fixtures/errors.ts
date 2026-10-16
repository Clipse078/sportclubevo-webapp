export class RoundRobinGenerationValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RoundRobinGenerationValidationError";
    this.code = code;
  }
}
