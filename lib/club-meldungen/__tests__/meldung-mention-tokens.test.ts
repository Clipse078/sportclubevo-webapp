import { describe, expect, it } from "vitest";
import {
  filterMentionedUserIdsPresentInBody,
  meldungMentionToken,
} from "../meldung-mention-tokens";

describe("meldung mention tokens", () => {
  it("drops users whose @token was removed from the body", () => {
    const body = `Hallo ${meldungMentionToken("Sandra", "Müller")}`;
    const ids = filterMentionedUserIdsPresentInBody(body, [
      { userId: "u1", firstName: "Sandra", lastName: "Müller" },
      { userId: "u2", firstName: "Scott", lastName: "Y" },
    ]);
    expect(ids).toEqual(["u1"]);
  });

  it("renders same-name tokens distinctly by full display name", () => {
    const body = `${meldungMentionToken("Alex", "Muster")} und ${meldungMentionToken("Alex", "Team")}`;
    const ids = filterMentionedUserIdsPresentInBody(body, [
      { userId: "a1", firstName: "Alex", lastName: "Muster" },
      { userId: "a2", firstName: "Alex", lastName: "Team" },
    ]);
    expect(ids).toEqual(["a1", "a2"]);
  });
});