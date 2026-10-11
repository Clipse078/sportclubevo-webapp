/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Info } from "lucide-react";
import { SceFeatureCard } from "../SceFeatureCard";

describe("SCE-UI-STANDARD-01 — SceFeatureCard", () => {
  it("renders title, description, and accessible heading", () => {
    render(
      <SceFeatureCard
        title="Publikation"
        description="Steuere, wo dieser Eintrag veröffentlicht wird."
        icon={Info}
        testId="sce-feature-card-demo"
      >
        <p>Body</p>
      </SceFeatureCard>,
    );

    expect(screen.getByTestId("sce-feature-card-demo")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Publikation" })).toBeInTheDocument();
    expect(screen.getByText(/Steuere, wo dieser Eintrag/)).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});
