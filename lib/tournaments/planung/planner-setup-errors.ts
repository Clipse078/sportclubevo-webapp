export class TournamentPlannerSetupNotAllowedError extends Error {
  readonly code: "ALREADY_SCHEDULED" | "NOT_TENANT_ORGANISED";

  constructor(code: "ALREADY_SCHEDULED" | "NOT_TENANT_ORGANISED") {
    super(
      code === "ALREADY_SCHEDULED"
        ? "Für dieses Turnier ist bereits ein Spielplan vorhanden."
        : "Turnierplanung ist für dieses Turnier nicht verfügbar.",
    );
    this.name = "TournamentPlannerSetupNotAllowedError";
    this.code = code;
  }
}
