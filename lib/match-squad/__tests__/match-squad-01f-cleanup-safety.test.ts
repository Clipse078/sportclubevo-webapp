import { describe, expect, it } from "vitest";
import {
  MATCH_SQUAD_CONTROLLED_PERSON_IDS,
  MATCH_SQUAD_CONTROLLED_TENANT_ID,
  MATCH_SQUAD_CONTROLLED_TENANT_KEY,
} from "@/lib/match-squad/match-squad-controlled-test-data-ledger";

describe("match-squad-01f cleanup ledger guards", () => {
  it("scopes tenant to fc-allschwil programme tenant", () => {
    expect(MATCH_SQUAD_CONTROLLED_TENANT_KEY).toBe("fc-allschwil");
    expect(MATCH_SQUAD_CONTROLLED_TENANT_ID).toBe("cmomwboak0000tsf3zzivrs46");
  });

  it("uses stable SCE Testspieler person ids from ledger", () => {
    expect(MATCH_SQUAD_CONTROLLED_PERSON_IDS).toHaveLength(6);
    expect(MATCH_SQUAD_CONTROLLED_PERSON_IDS.every((id) => id.startsWith("cmv2m"))).toBe(true);
  });
});
