import { describe, expect, it } from "vitest";
import InitiativeBacklogPage from "../page";

describe("/vereinsleitung/initiativen/backlog page", () => {
  it("exports the default server page component", () => {
    expect(typeof InitiativeBacklogPage).toBe("function");
    expect(InitiativeBacklogPage.name).toBe("InitiativeBacklogPage");
  });
});
