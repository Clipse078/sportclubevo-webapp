/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  crestDensityForFixtureVariant,
  SceTournamentFixtureParticipant,
  SceTournamentFixtureVs,
} from "../SceTournamentFixtureIdentity";
import type { ClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { expectCanonicalFixtureIdentityOrder } from "./fixture-identity-order-assertions";

const identity: ClubIdentity = {
  displayName: "FC Allschwil",
  logoUrl: "https://example.com/crest.png",
  fallbackIdentity: { kind: "initials", label: "FA" },
};

describe("SceTournamentFixtureIdentity", () => {
  it("orders side A as name then crest toward VS", () => {
    const { container } = render(
      <SceTournamentFixtureParticipant
        identity={identity}
        label="Team Alpha"
        density="standard"
        align="start"
      />,
    );
    const segments = container.querySelectorAll("[data-fixture-identity-segment]");
    expect(Array.from(segments).map((el) => el.getAttribute("data-fixture-identity-segment"))).toEqual([
      "name",
      "crest",
    ]);
  });

  it("orders side B as crest then name away from VS", () => {
    const { container } = render(
      <SceTournamentFixtureParticipant
        identity={identity}
        label="Team Beta"
        density="standard"
        align="end"
      />,
    );
    const segments = container.querySelectorAll("[data-fixture-identity-segment]");
    expect(Array.from(segments).map((el) => el.getAttribute("data-fixture-identity-segment"))).toEqual([
      "crest",
      "name",
    ]);
  });

  it("maps planung crest variants without shrinking Spielplan standard", () => {
    expect(crestDensityForFixtureVariant("spielplanStandard")).toBe("compact");
    expect(crestDensityForFixtureVariant("spielplanCompact")).toBe("micro");
    expect(crestDensityForFixtureVariant("planung")).toBe("management");
    expect(crestDensityForFixtureVariant("planungBoard")).toBe("compact");
  });

  it("renders planung crest size on participant segment", () => {
    const { container } = render(
      <SceTournamentFixtureParticipant
        identity={identity}
        label="Team Alpha"
        density="compact"
        crestVariant="planung"
        align="start"
      />,
    );
    const crest = container.querySelector('[data-fixture-identity-segment="crest"]');
    expect(crest).toHaveAttribute("data-fixture-crest-size", "management");
  });

  it("composes canonical matchup segment order", () => {
    const { container } = render(
      <div data-testid="matchup">
        <SceTournamentFixtureParticipant
          identity={identity}
          label="Team Alpha"
          density="standard"
          align="start"
        />
        <SceTournamentFixtureVs />
        <SceTournamentFixtureParticipant
          identity={identity}
          label="Team Beta"
          density="standard"
          align="end"
        />
      </div>,
    );
    expectCanonicalFixtureIdentityOrder(container);
  });
});
