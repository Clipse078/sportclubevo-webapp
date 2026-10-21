import { describe, expect, it } from "vitest";
import {
  deriveOrgUnitResponsibility,
  ORG_UNIT_NO_RESPONSIBLE_LABEL,
} from "@/lib/org/org-unit-responsibility";

describe("deriveOrgUnitResponsibility", () => {
  it("uses primary memberships only — no inference from non-primary rows", () => {
    const result = deriveOrgUnitResponsibility([
      {
        id: "m1",
        isPrimary: false,
        roleKey: "KOORDINATOR",
        user: { id: "u1", firstName: "Fabio", lastName: "Rossi", email: null },
        person: null,
      },
    ]);
    expect(result.hasExplicitResponsible).toBe(false);
    expect(result.primary).toBeNull();
  });

  it("surfaces explicit primary responsible person with role key preserved", () => {
    const result = deriveOrgUnitResponsibility([
      {
        id: "m1",
        isPrimary: true,
        roleKey: "KOORDINATOR",
        user: null,
        person: {
          id: "p1",
          firstName: "Fabio",
          lastName: "Example",
          displayName: null,
          email: null,
        },
      },
    ]);
    expect(result.primary?.displayName).toBe("Fabio Example");
    expect(result.primary?.roleKey).toBe("KOORDINATOR");
    expect(result.additionalPrimaryCount).toBe(0);
  });

  it("handles multiple primary memberships with lead + additional count", () => {
    const result = deriveOrgUnitResponsibility([
      {
        id: "m1",
        isPrimary: true,
        roleKey: null,
        user: { id: "u1", firstName: "A", lastName: "Lead", email: null },
        person: null,
      },
      {
        id: "m2",
        isPrimary: true,
        roleKey: null,
        user: { id: "u2", firstName: "B", lastName: "Other", email: null },
        person: null,
      },
    ]);
    expect(result.primary?.displayName).toBe("A Lead");
    expect(result.additionalPrimaryCount).toBe(1);
  });

  it("empty state has no fabricated responsible person", () => {
    const result = deriveOrgUnitResponsibility([]);
    expect(result.hasExplicitResponsible).toBe(false);
    expect(ORG_UNIT_NO_RESPONSIBLE_LABEL).toBe("Keine Zuweisung");
  });
});
