// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import CreateInitiativeComposerDialog from "@/components/admin/initiatives/CreateInitiativeComposerDialog";
import { sceSerializeFormSnapshot } from "@/lib/ux/sce-composer-form-snapshot";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/components/admin/shared/visibility/AllowlistPanel", () => ({
  default: () => null,
}));

const postMock = vi.fn();

function titleInput() {
  return screen.getByPlaceholderText(/Website Relaunch/i);
}

beforeEach(() => {
  postMock.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/initiatives" && init?.method === "POST") {
        return postMock(init);
      }
      return { ok: false, json: async () => ({}) };
    }),
  );
});

describe("SCE-UX-01A/B — Club Development composers", () => {
  it("exposes workspace dialog shell with composer layout marker", () => {
    render(<CreateInitiativeComposerDialog open onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: /Neue Initiative/i })).toBeInTheDocument();
    expect(screen.getByTestId("create-initiative-composer")).toBeInTheDocument();
  });

  it("cancel without edits closes immediately", () => {
    const onClose = vi.fn();
    render(<CreateInitiativeComposerDialog open onClose={onClose} />);
    fireEvent.click(screen.getByTestId("initiative-form-cancel"));
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByTestId("sce-unsaved-discard")).not.toBeInTheDocument();
  });

  it("cancel with edits shows unsaved dialog; continue keeps composer open", async () => {
    const onClose = vi.fn();
    render(<CreateInitiativeComposerDialog open onClose={onClose} />);
    fireEvent.change(titleInput(), { target: { value: "Test" } });
    fireEvent.click(screen.getByTestId("initiative-form-cancel"));
    expect(screen.getByTestId("sce-unsaved-discard")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("sce-unsaved-continue"));
    await waitFor(() => {
      expect(screen.queryByTestId("sce-unsaved-discard")).not.toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("discard closes composer after edits", () => {
    const onClose = vi.fn();
    render(<CreateInitiativeComposerDialog open onClose={onClose} />);
    fireEvent.change(titleInput(), { target: { value: "Test" } });
    fireEvent.click(screen.getByTestId("initiative-form-cancel"));
    fireEvent.click(screen.getByTestId("sce-unsaved-discard"));
    expect(onClose).toHaveBeenCalled();
  });

  it("successful save does not show unsaved guard on close", async () => {
    postMock.mockResolvedValue({
      ok: true,
      json: async () => ({ initiative: { slug: "demo" } }),
    });

    function Host() {
      const [open, setOpen] = useState(true);
      return <CreateInitiativeComposerDialog open={open} onClose={() => setOpen(false)} />;
    }

    render(<Host />);
    fireEvent.change(titleInput(), { target: { value: "Saved" } });
    fireEvent.click(screen.getByRole("button", { name: /Initiative erstellen/i }));
    await waitFor(() => {
      expect(postMock).toHaveBeenCalled();
    });
    expect(screen.queryByTestId("sce-unsaved-discard")).not.toBeInTheDocument();
  });

  it("validation error keeps input and does not mark saved", () => {
    render(<CreateInitiativeComposerDialog open onClose={vi.fn()} />);
    const form = document.querySelector('[data-testid="create-initiative-composer"] form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);
    expect(screen.getByRole("alert")).toHaveTextContent(/Titel ist erforderlich/i);
    expect(postMock).not.toHaveBeenCalled();
  });

  it("snapshot helper detects real field changes only", () => {
    const base = sceSerializeFormSnapshot({ title: "" });
    const changed = sceSerializeFormSnapshot({ title: "X" });
    expect(base).not.toEqual(changed);
    expect(sceSerializeFormSnapshot({ title: "" })).toEqual(base);
  });
});
