/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinancePublicationDistributionDialog } from "@/components/admin/finance/reporting/FinancePublicationDistributionDialog";
import { FinancePublicationDistributionEmailDeliveryError } from "@/lib/finance/delivery/finance-publication-distribution-email-port";
import { FinanceDomainError } from "@/lib/finance/errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildPoBaselineManagementPnlReadModel,
} from "@/lib/finance/uat/sce-finance-06b-r5-immutability-uat";
import { publishFinanceManagementPnlSnapshot } from "@/lib/finance/services/finance-publication-service";
import * as managementReporting from "@/lib/finance/services/finance-management-reporting-query-service";
import { createFinancePublicationDistribution } from "@/lib/finance/services/finance-publication-distribution-service";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  createPublicationDistributionMockStore,
  makePublicationDistributionMockPrisma,
} from "@/lib/finance/__tests__/finance-06e-publication-distribution-mock-db";
import {
  FINANCE_PUBLICATION_DISTRIBUTION_TRANSPORT_UNAVAILABLE,
  resolveFinancePublicationDistributionSendUserMessage,
} from "@/lib/finance/publishing/finance-publication-distribution-action-errors";

const sendAction = vi.fn();
const searchRecipients = vi.fn();

vi.mock("@/app/(admin)/dashboard/finance/reports/publication-distribution-actions", () => ({
  sendFinancePublicationDistributionAction: (...args: unknown[]) => sendAction(...args),
  searchFinancePublicationDistributionPersonCandidatesAction: (...args: unknown[]) =>
    searchRecipients(...args),
  loadFinancePublicationDistributionHistoryAction: vi.fn(),
  loadFinancePublicationDistributionDetailAction: vi.fn(),
}));

const labels = {
  dialogTitle: "Send",
  sendAction: "Send",
  historyAction: "History",
  historyTitle: "History",
  historyEmpty: "Empty",
  optionalMessageLabel: "Message",
  optionalMessagePlaceholder: "Optional",
  reviewHeading: "Review",
  reviewVersion: "Version {version}",
  reviewRecipients: "Recipients {count}",
  reviewMessage: "Message",
  reviewMessageEmpty: "None",
  sendConfirm: "Senden",
  sending: "Wird gesendet…",
  sendSuccess: "OK",
  sendPartial: "Partial",
  sendFailed: "Generic fail",
  loadingHistory: "Loading",
  distributionSummary: "Summary",
  viewRecipients: "View",
  recipientSent: "Sent",
  recipientFailed: "Failed",
  externalRecipient: "External",
  statusCompleted: "COMPLETED",
  statusPartial: "PARTIAL",
  statusFailed: "FAILED",
  recipientPicker: {
    recipientsLabel: "Recipients",
    addPerson: "Add",
    personDialogTitle: "Pick",
    searchPlaceholder: "Search",
    searchLoading: "Loading",
    searchEmpty: "Empty",
    externalEmailLabel: "Email",
    externalEmailPlaceholder: "email",
    addExternal: "Add external",
    externalBadge: "External",
    invalidEmail: "Invalid",
  },
};

const tenantA = "tenant-a";
const yearId = "fy-2026";

function ctx(permissions: string[]): FinanceAuthContext {
  return { tenantId: tenantA, userId: "user-1", permissionKeys: new Set(permissions) };
}

const distributePerms = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_DISTRIBUTE,
];

const publishPerms = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_PUBLISH,
];

const emailLabels = {
  subject: "Subject",
  greeting: "Hi",
  intro: "Intro",
  optionalMessageHeading: "Note",
  viewReportCta: "View",
  downloadPdfCta: "PDF",
  footer: "Footer",
};

describe("FIN-06E-R3 send execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    searchRecipients.mockResolvedValue({ ok: true, candidates: [] });
  });

  it("clears sending state after successful action resolution", async () => {
    let resolveSend!: (value: unknown) => void;
    sendAction.mockReturnValue(
      new Promise((resolve) => {
        resolveSend = resolve;
      }),
    );

    render(
      <FinancePublicationDistributionDialog
        open
        onClose={() => undefined}
        publicationId="pub-1"
        versionNumber={4}
        financeYearName="FY 2026"
        publishedAtLabel="today"
        formattingLocale="de-CH"
        labels={labels}
      />,
    );

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("email"), "test@example.com");
    await user.click(screen.getByRole("button", { name: "Add external" }));

    const sendButton = screen.getByRole("button", { name: "Senden" });
    await user.click(sendButton);
    expect(sendButton).toHaveTextContent("Wird gesendet…");

    resolveSend({
      ok: true,
      distributionId: "dist-1",
      status: "COMPLETED",
      recipientCount: 1,
      sentCount: 1,
      failedCount: 0,
      reused: false,
    });

    await waitFor(() => {
      expect(sendButton).toHaveTextContent("Senden");
      expect(sendButton).not.toBeDisabled();
    });
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("clears sending state and shows actionable failure from server", async () => {
    sendAction.mockResolvedValue({
      ok: false,
      errorCode: "SEND_FAILED",
      error: FINANCE_PUBLICATION_DISTRIBUTION_TRANSPORT_UNAVAILABLE,
    });

    render(
      <FinancePublicationDistributionDialog
        open
        onClose={() => undefined}
        publicationId="pub-1"
        versionNumber={4}
        financeYearName="FY 2026"
        publishedAtLabel="today"
        formattingLocale="de-CH"
        labels={labels}
      />,
    );

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("email"), "test@example.com");
    await user.click(screen.getByRole("button", { name: "Add external" }));
    const sendButton = screen.getByRole("button", { name: "Senden" });
    await user.click(sendButton);

    await waitFor(() => {
      expect(sendButton).toHaveTextContent("Senden");
    });
    expect(screen.getByText(FINANCE_PUBLICATION_DISTRIBUTION_TRANSPORT_UNAVAILABLE)).toBeInTheDocument();
  });

  it("maps transport unavailable domain errors to user copy", () => {
    expect(
      resolveFinancePublicationDistributionSendUserMessage(
        new FinanceDomainError(
          "FINANCE_PUBLICATION_DISTRIBUTION_UNAVAILABLE",
          "internal",
          503,
        ),
      ),
    ).toBe(FINANCE_PUBLICATION_DISTRIBUTION_TRANSPORT_UNAVAILABLE);
    expect(
      resolveFinancePublicationDistributionSendUserMessage(
        new FinancePublicationDistributionEmailDeliveryError(
          "NOT_CONFIGURED",
          "missing",
          true,
        ),
      ),
    ).toBe(FINANCE_PUBLICATION_DISTRIBUTION_TRANSPORT_UNAVAILABLE);
  });

  it("fails fast before creating distribution when transport is unavailable", async () => {
    const store = createPublicationDistributionMockStore();
    store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
    store.tenant.push({ id: tenantA, name: "Club A" });
    store.user.push({ id: "user-1", firstName: "Alex", lastName: "Admin" });
    const prisma = makePublicationDistributionMockPrisma(store);
    vi.spyOn(managementReporting, "loadFinanceManagementPnlReadModel").mockResolvedValue(
      buildPoBaselineManagementPnlReadModel({ tenantId: tenantA, financeYearId: yearId }),
    );
    const published = await publishFinanceManagementPnlSnapshot(prisma, ctx(publishPerms), {
      financeYearId: yearId,
    });

    await expect(
      createFinancePublicationDistribution(prisma, ctx(distributePerms), {
        publicationId: published.publicationId,
        versionNumber: 1,
        idempotencyKey: "idem-transport-off",
        localeCode: "de",
        recipients: [{ kind: "EXTERNAL", email: "ext@example.com" }],
        emailLabels,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_PUBLICATION_DISTRIBUTION_UNAVAILABLE" });

    expect(store.financePublicationDistribution).toHaveLength(0);
  });

  it("reuses terminal distribution without requiring transport preflight", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "SportClubEvo <noreply@test.example>";
    const store = createPublicationDistributionMockStore();
    store.financeYear.push({ id: yearId, tenantId: tenantA, name: "FY 2026" });
    store.tenant.push({ id: tenantA, name: "Club A" });
    store.user.push({ id: "user-1", firstName: "Alex", lastName: "Admin" });
    store.financePublicationDistribution.push({
      id: "dist-existing",
      tenantId: tenantA,
      publicationId: "pub-1",
      publicationVersionId: "ver-1",
      createdByUserId: "user-1",
      optionalMessage: null,
      status: "FAILED",
      idempotencyKey: "idem-existing",
      localeCode: "de",
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: new Date(),
    });
    store.financePublicationDistributionRecipient.push({
      id: "rec-1",
      tenantId: tenantA,
      distributionId: "dist-existing",
      personId: null,
      recipientEmail: "ext@example.com",
      recipientDisplayName: null,
      isExternalRecipient: true,
      publicationShareId: null,
      status: "FAILED",
      sentAt: null,
      failedAt: new Date(),
      failureCode: "NOT_CONFIGURED",
      deliveryMetadataJson: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const prisma = makePublicationDistributionMockPrisma(store);
    delete process.env.RESEND_API_KEY;

    const reused = await createFinancePublicationDistribution(prisma, ctx(distributePerms), {
      publicationId: "pub-1",
      versionNumber: 1,
      idempotencyKey: "idem-existing",
      localeCode: "de",
      recipients: [{ kind: "EXTERNAL", email: "ext@example.com" }],
      emailLabels,
    });

    expect(reused.reused).toBe(true);
    expect(reused.primaryFailureCode).toBe("NOT_CONFIGURED");
  });
});
