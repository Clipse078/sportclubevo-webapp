// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { SceTextInput } from "@/components/sce/forms/SceTextInput";

describe("SceFormField", () => {
  it("associates label, control, description, and error", () => {
    render(
      <SceFormField
        label="Testfeld"
        htmlFor="test-input"
        required
        description="Hilfetext"
        error="Pflichtangabe fehlt"
      >
        <SceTextInput id="test-input" invalid />
      </SceFormField>,
    );

    expect(screen.getByLabelText(/Testfeld/)).toHaveAttribute("id", "test-input");
    expect(screen.getByText("Hilfetext")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Pflichtangabe fehlt");
  });
});
