/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { FinancePublicationFastShareButton } from "@/components/admin/finance/reporting/FinancePublicationFastShareButton";
import {
  FINANCE_06D_R2R3_FAST_SHARE_DISCOVERABILITY,
} from "@/lib/finance/publishing/finance-06d-r2-fast-path-contract";
import {
  formatCompactFinancePublicationShareUrlLabel,
  buildFinancePublicationShareAbsoluteUrlFromPath,
} from "@/lib/finance/presentation/format-finance-publication-share-url-display";

const ensureDefault = vi.fn();
const copyShareUrl = vi.fn();

vi.mock("@/app/(admin)/dashboard/finance/reports/publication-share-actions", () => ({
  ensureDefaultFinancePublicationShareAction: (...args: unknown[]) => ensureDefault(...args),
}));

vi.mock("@/lib/finance/presentation/copy-finance-publication-share-url", () => ({
  copyFinancePublicationShareAbsoluteUrl: (...args: unknown[]) => copyShareUrl(...args),
}));

const SHARE_PATH = "/share/finance/publication/abc123tokenXYx7Kd";

const labels = {
  shareAction: "Teilen",
  copyLink: "Link kopieren",
  openLink: "Link öffnen",
  linkCopiedTitle: "Freigabelink kopiert",
  linkCreatedTitle: "Freigabelink erstellt",
  linkCopiedBody: "{year} · Version {version}",
  linkCopySuccess: "Link kopiert",
  createFailed: "Failed",
  manageAction: "Freigabe verwalten",
};

function renderFastShare() {
  return render(
    <ToastProvider>
      <FinancePublicationFastShareButton
        publicationId="pub-1"
        versionNumber={4}
        financeYearName="FY 2026"
        labels={labels}
      />
    </ToastProvider>,
  );
}

describe("FIN-06D-R2R3 fast share discoverability", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    ensureDefault.mockReset();
    copyShareUrl.mockReset();
    copyShareUrl.mockResolvedValue(true);
    openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it("documents R2R3 discoverability contract", () => {
    expect(FINANCE_06D_R2R3_FAST_SHARE_DISCOVERABILITY.SUCCESS_FEEDBACK_SHOWS_COMPACT_URL).toBe(
      true,
    );
    expect(FINANCE_06D_R2R3_FAST_SHARE_DISCOVERABILITY.RE_COPY_DOES_NOT_ENSURE_SHARE).toBe(true);
  });

  it("Teilen calls ensure/reuse once and shows copied confirmation with compact URL", async () => {
    ensureDefault.mockResolvedValue({
      ok: true,
      shareUrlPath: SHARE_PATH,
      shareId: "share-1",
      expiresAt: null,
      versionNumber: 4,
      reused: false,
    });

    const user = userEvent.setup();
    renderFastShare();
    await user.click(screen.getByRole("button", { name: "Teilen" }));

    expect(ensureDefault).toHaveBeenCalledTimes(1);
    expect(ensureDefault).toHaveBeenCalledWith({
      publicationId: "pub-1",
      versionNumber: 4,
    });
    await waitFor(() => {
      expect(copyShareUrl).toHaveBeenCalledWith(`${window.location.origin}${SHARE_PATH}`);
    });

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Freigabelink kopiert")).toBeTruthy();
    const display = within(alert).getByTestId("finance-publication-fast-share-url-display");
    expect(display.textContent).toMatch(/\/share\/finance\/…x7Kd$/);
  });

  it("Link kopieren re-copies without another ensure call", async () => {
    ensureDefault.mockResolvedValue({
      ok: true,
      shareUrlPath: SHARE_PATH,
      shareId: "share-1",
      expiresAt: null,
      versionNumber: 4,
      reused: true,
    });

    const user = userEvent.setup();
    renderFastShare();
    await user.click(screen.getByRole("button", { name: "Teilen" }));
    await screen.findByRole("alert");
    copyShareUrl.mockClear();

    await user.click(screen.getByRole("button", { name: "Link kopieren" }));
    expect(ensureDefault).toHaveBeenCalledTimes(1);
    expect(copyShareUrl).toHaveBeenCalledWith(`${window.location.origin}${SHARE_PATH}`);
  });

  it("Link öffnen opens the same absolute URL without ensure", async () => {
    ensureDefault.mockResolvedValue({
      ok: true,
      shareUrlPath: SHARE_PATH,
      shareId: "share-1",
      expiresAt: null,
      versionNumber: 4,
      reused: true,
    });

    const user = userEvent.setup();
    renderFastShare();
    await user.click(screen.getByRole("button", { name: "Teilen" }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Link öffnen" }));
    expect(ensureDefault).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(
      `${window.location.origin}${SHARE_PATH}`,
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("repeated Teilen reuses share and shows the same URL label", async () => {
    ensureDefault.mockResolvedValue({
      ok: true,
      shareUrlPath: SHARE_PATH,
      shareId: "share-1",
      expiresAt: null,
      versionNumber: 4,
      reused: false,
    });

    const user = userEvent.setup();
    renderFastShare();
    await user.click(screen.getByRole("button", { name: "Teilen" }));
    const firstDisplay = await screen.findByTestId("finance-publication-fast-share-url-display");
    const firstLabel = firstDisplay.textContent;

    ensureDefault.mockResolvedValue({
      ok: true,
      shareUrlPath: SHARE_PATH,
      shareId: "share-1",
      expiresAt: null,
      versionNumber: 4,
      reused: true,
    });

    await user.click(screen.getByRole("button", { name: "Teilen" }));
    const alerts = screen.getAllByRole("alert");
    const secondDisplay = within(alerts[alerts.length - 1]!).getByTestId(
      "finance-publication-fast-share-url-display",
    );
    expect(secondDisplay.textContent).toBe(firstLabel);
    expect(ensureDefault).toHaveBeenCalledTimes(2);
  });

  it("clipboard failure shows created title, not copied", async () => {
    copyShareUrl.mockResolvedValue(false);
    ensureDefault.mockResolvedValue({
      ok: true,
      shareUrlPath: SHARE_PATH,
      shareId: "share-1",
      expiresAt: null,
      versionNumber: 4,
      reused: false,
    });

    const user = userEvent.setup();
    renderFastShare();
    await user.click(screen.getByRole("button", { name: "Teilen" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Freigabelink erstellt")).toBeTruthy();
    expect(within(alert).queryByText("Freigabelink kopiert")).toBeNull();
    expect(within(alert).getByRole("button", { name: "Link kopieren" })).toBeTruthy();
  });
});

describe("format-finance-publication-share-url-display", () => {
  it("builds absolute URL and compact host/path label", () => {
    const absolute = buildFinancePublicationShareAbsoluteUrlFromPath({
      origin: "https://sportclubevo.com",
      relativeSharePath: SHARE_PATH,
    });
    expect(absolute).toBe(`https://sportclubevo.com${SHARE_PATH}`);

    const compact = formatCompactFinancePublicationShareUrlLabel({
      origin: "https://sportclubevo.com",
      relativeSharePath: SHARE_PATH,
    });
    expect(compact).toBe("sportclubevo.com/share/finance/…x7Kd");
  });
});
