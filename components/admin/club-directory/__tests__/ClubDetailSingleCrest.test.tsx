/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));
import { ClubLogo } from "../ClubLogo";
import { LogoUploadCard } from "../LogoUploadCard";

describe("club detail profile — single crest", () => {
  it("read state shows one club logo image when upload control hides duplicate crest", () => {
    render(
      <div data-testid="club-profile-crest">
        <ClubLogo logoUrl="https://example.com/crest.png" name="AC Rossoneri" size="lg" />
        <LogoUploadCard
          resource="club"
          id="club-1"
          name="AC Rossoneri"
          logoUrl="https://example.com/crest.png"
          showCrest={false}
        />
      </div>,
    );

    expect(screen.getAllByRole("img", { name: /Logo AC Rossoneri/i })).toHaveLength(1);
    expect(screen.getByTestId("club-logo-upload-button")).toHaveTextContent("Logo ersetzen");
  });
});
