import { describe, expect, it } from "vitest";
import { SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES } from "../defaults";
import {
  matchTimingToOperationalInput,
  resolveMatchOperationalInterval,
} from "../resolve-match-operational-interval";
import type { TenantMatchOperationalPolicyResolved } from "../tenant-operational-policy-service";

const START = "2026-09-19T05:30:00.000Z"; // 07:30 Europe/Zurich (CEST)

function clubPolicy(minutes: number): TenantMatchOperationalPolicyResolved {
  return { defaultMatchDurationMinutes: minutes, isClubConfigured: true };
}

function platformPolicy(): TenantMatchOperationalPolicyResolved {
  return {
    defaultMatchDurationMinutes: SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES,
    isClubConfigured: false,
  };
}

describe("resolveMatchOperationalInterval", () => {
  it("1. club default 120, provider end null → 09:30 CLUB_DEFAULT", () => {
    const result = resolveMatchOperationalInterval(
      matchTimingToOperationalInput({ startAt: START, endAt: null }, clubPolicy(120)),
    );
    expect(result.endAt.toISOString()).toBe("2026-09-19T07:30:00.000Z");
    expect(result.durationSource).toBe("CLUB_DEFAULT");
    expect(result.endSource).toBe("CONFIGURED_DEFAULT");
    expect(result.isDerived).toBe(true);
  });

  it("2. club default 105 → 09:15", () => {
    const result = resolveMatchOperationalInterval(
      matchTimingToOperationalInput({ startAt: START, endAt: null }, clubPolicy(105)),
    );
    expect(result.endAt.toISOString()).toBe("2026-09-19T07:15:00.000Z");
  });

  it("3. provider end equals start → derive with club default", () => {
    const result = resolveMatchOperationalInterval(
      matchTimingToOperationalInput({ startAt: START, endAt: START }, clubPolicy(120)),
    );
    expect(result.endAt.toISOString()).toBe("2026-09-19T07:30:00.000Z");
    expect(result.endSource).toBe("CONFIGURED_DEFAULT");
  });

  it("4. meaningful authoritative end wins", () => {
    const result = resolveMatchOperationalInterval(
      matchTimingToOperationalInput(
        { startAt: START, endAt: "2026-09-19T07:15:00.000Z" },
        clubPolicy(120),
      ),
    );
    expect(result.endAt.toISOString()).toBe("2026-09-19T07:15:00.000Z");
    expect(result.endSource).toBe("AUTHORITATIVE");
  });

  it("5. SCE override wins over club default", () => {
    const result = resolveMatchOperationalInterval(
      matchTimingToOperationalInput(
        {
          startAt: START,
          endAt: null,
          operationalEndAtOverride: "2026-09-19T07:00:00.000Z",
        },
        clubPolicy(120),
      ),
    );
    expect(result.endAt.toISOString()).toBe("2026-09-19T07:00:00.000Z");
    expect(result.endSource).toBe("SCE_OVERRIDE");
  });

  it("6. override cleared → automatic resolution", () => {
    const automatic = resolveMatchOperationalInterval(
      matchTimingToOperationalInput({ startAt: START, endAt: null }, clubPolicy(120)),
    );
    expect(automatic.isOverride).toBe(false);
    expect(automatic.endSource).toBe("CONFIGURED_DEFAULT");
  });

  it("7. start change shifts derived end", () => {
    const laterStart = "2026-09-19T06:00:00.000Z";
    const result = resolveMatchOperationalInterval(
      matchTimingToOperationalInput({ startAt: laterStart, endAt: null }, clubPolicy(120)),
    );
    expect(result.endAt.toISOString()).toBe("2026-09-19T08:00:00.000Z");
  });

  it("9. no tenant setting → platform fallback 120", () => {
    const result = resolveMatchOperationalInterval(
      matchTimingToOperationalInput({ startAt: START, endAt: null }, platformPolicy()),
    );
    expect(result.durationSource).toBe("PLATFORM_DEFAULT");
    expect(result.endSource).toBe("PLATFORM_FALLBACK");
    expect(result.durationMinutes).toBe(120);
  });

  it("10. overnight configured fallback 23:00 + 120 → next day 01:00", () => {
    const result = resolveMatchOperationalInterval(
      matchTimingToOperationalInput(
        { startAt: "2026-09-19T21:00:00.000Z", endAt: null },
        clubPolicy(120),
      ),
    );
    expect(result.endAt.toISOString()).toBe("2026-09-19T23:00:00.000Z");
  });

  it("11. explicit overnight interval remains valid", () => {
    const result = resolveMatchOperationalInterval(
      matchTimingToOperationalInput(
        {
          startAt: "2026-09-19T21:00:00.000Z",
          endAt: "2026-09-19T23:00:00.000Z",
        },
        clubPolicy(120),
      ),
    );
    expect(result.endSource).toBe("AUTHORITATIVE");
    expect(result.endAt.toISOString()).toBe("2026-09-19T23:00:00.000Z");
  });

  it("override wins over later authoritative end (precedence contract)", () => {
    const result = resolveMatchOperationalInterval(
      matchTimingToOperationalInput(
        {
          startAt: START,
          endAt: "2026-09-19T07:30:00.000Z",
          operationalEndAtOverride: "2026-09-19T07:00:00.000Z",
        },
        clubPolicy(120),
      ),
    );
    expect(result.endSource).toBe("SCE_OVERRIDE");
  });
});
