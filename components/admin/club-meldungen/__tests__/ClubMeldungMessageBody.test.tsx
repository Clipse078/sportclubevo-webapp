// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClubMeldungMessageBody } from "../ClubMeldungMessageBody";

describe("ClubMeldungMessageBody", () => {
  it("highlights @mentions safely as text", () => {
    render(
      <ClubMeldungMessageBody
        body="Bitte @Sandra Müller prüfen"
        mentions={[{ userId: "u1", displayName: "Sandra Müller" }]}
      />,
    );
    expect(screen.getByTestId("meldung-message-mention")).toHaveTextContent("@Sandra Müller");
  });
});