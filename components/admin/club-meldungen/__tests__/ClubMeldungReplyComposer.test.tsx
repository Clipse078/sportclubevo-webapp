// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useState } from "react";
import {
  ClubMeldungReplyComposer,
  detectMentionContext,
  MENTION_NO_MATCH_COPY,
  MENTION_UNAVAILABLE_COPY,
} from "@/components/admin/club-meldungen/ClubMeldungReplyComposer";

function MentionHarness(props: { mentionsEnabled?: boolean }) {
  const [body, setBody] = useState("");
  return (
    <ClubMeldungReplyComposer
      tenantSlug="fc-demo"
      meldungId="mel-1"
      audience="INTERNAL_NOTE"
      mentionsEnabled={props.mentionsEnabled ?? true}
      body={body}
      onBodyChange={setBody}
      mentionedUserIds={[]}
      onMentionedUserIdsChange={() => undefined}
      onSubmit={() => undefined}
    />
  );
}

describe("detectMentionContext", () => {
  it("extracts query after @ with word boundary", () => {
    expect(detectMentionContext("Hallo @pat", 10)?.query).toBe("pat");
    expect(detectMentionContext("email@test", 10)).toBeNull();
  });
});

describe("ClubMeldungReplyComposer mentions", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows no-match copy when API returns empty candidates", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] }),
    } as Response);

    render(<MentionHarness />);
    fireEvent.change(screen.getByLabelText("Interner Kommentar verfassen"), {
      target: { value: "@pat" },
    });

    await waitFor(() => {
      expect(screen.getByText(MENTION_NO_MATCH_COPY)).toBeTruthy();
    });
    expect(screen.queryByText("Keine Vorschläge")).toBeNull();
  });

  it("shows unavailable copy on 503 schema errors", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ code: "SCHEMA_UNAVAILABLE" }),
    } as Response);

    render(<MentionHarness />);
    fireEvent.change(screen.getByLabelText("Interner Kommentar verfassen"), {
      target: { value: "@pat" },
    });

    await waitFor(() => {
      expect(screen.getByText(MENTION_UNAVAILABLE_COPY)).toBeTruthy();
    });
  });

  it("skips mention fetch when schema feature disabled", async () => {
    render(<MentionHarness mentionsEnabled={false} />);
    fireEvent.change(screen.getByLabelText("Interner Kommentar verfassen"), {
      target: { value: "@pat more" },
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});