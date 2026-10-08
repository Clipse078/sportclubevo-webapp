/**
 * @vitest-environment jsdom
 *
 * ADMIN-HARD-DELETE — focused tests for the Benutzer delete/removal UI.
 * PEOPLE-ACCESS-IMPERSONATION-01R7 — row action menu UX + impersonation visibility.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import UserRowActionsMenu from "@/components/admin/users/UserRowActionsMenu";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("@/components/ui/Dialog", () => ({
  Dialog: ({ open, children, footer, title }: {
    open: boolean;
    children: React.ReactNode;
    footer?: React.ReactNode;
    title?: string;
  }) =>
    open ? (
      <div role="dialog" aria-label={title ?? "dialog"}>
        {children}
        {footer}
      </div>
    ) : null,
}));

vi.mock("@/components/ui/Button", () => ({
  Button: ({ children, onClick, disabled, loading }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled || loading}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/admin/users/ImpersonateButton", () => ({
  default: ({ onActivate }: { onActivate?: () => void }) => (
    <button type="button" role="menuitem" onClick={() => onActivate?.()}>
      Als Benutzer ansehen
    </button>
  ),
}));

const BASE_PROPS = {
  userId: "user-1",
  userName: "Max Muster",
  userEmail: "max@example.com",
  pendingInvitation: false,
  isSelf: false,
  linkedPersonName: null,
  tenantRoleNames: [],
};

function openMenu(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole("button", { name: /mehr aktionen/i }));
}

describe("UserRowActionsMenu", () => {
  it("1. Club Admin sees 'Aus Verein entfernen' in the ••• menu", async () => {
    const user = userEvent.setup();
    render(
      <UserRowActionsMenu
        {...BASE_PROPS}
        canManageMembership={true}
        canGlobalDelete={false}
      />,
    );

    await openMenu(user);
    expect(screen.getByText("Aus Verein entfernen")).toBeInTheDocument();
  });

  it("1b. eligible target + authorized actor sees impersonation and ordered normal actions", async () => {
    const user = userEvent.setup();
    const onEditAccess = vi.fn();
    render(
      <UserRowActionsMenu
        {...BASE_PROPS}
        canManageMembership={true}
        canGlobalDelete={false}
        canImpersonateTarget={true}
        canShowAdminShortcuts={true}
        onEditAccess={onEditAccess}
      />,
    );

    await openMenu(user);

    const menu = screen.getByRole("menu", { name: /benutzeraktionen/i });
    const items = within(menu).getAllByRole("menuitem");
    expect(items[0]).toHaveTextContent("Als Benutzer ansehen");
    expect(items[1]).toHaveTextContent("Zugriff bearbeiten");
    expect(items[2]).toHaveTextContent("Detailseite");
    expect(within(menu).getByRole("separator")).toBeInTheDocument();
    expect(screen.getByText("Aus Verein entfernen")).toBeInTheDocument();
  });

  it("R7 — unauthorized actor: impersonation action absent", async () => {
    const user = userEvent.setup();
    render(
      <UserRowActionsMenu
        {...BASE_PROPS}
        canManageMembership={true}
        canGlobalDelete={false}
        canImpersonateTarget={false}
        canShowAdminShortcuts={true}
        onEditAccess={vi.fn()}
      />,
    );

    await openMenu(user);
    expect(screen.queryByText("Als Benutzer ansehen")).not.toBeInTheDocument();
    expect(screen.getByText("Zugriff bearbeiten")).toBeInTheDocument();
  });

  it("R7 — self row: no menu when only self-blocked admin actions", () => {
    const { container } = render(
      <UserRowActionsMenu
        {...BASE_PROPS}
        isSelf={true}
        canManageMembership={true}
        canGlobalDelete={false}
        canImpersonateTarget={true}
        canShowAdminShortcuts={true}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("R7 — admin shortcuts off: access/detail hidden (system/inactive handled upstream)", async () => {
    const user = userEvent.setup();
    render(
      <UserRowActionsMenu
        {...BASE_PROPS}
        canManageMembership={true}
        canGlobalDelete={false}
        canImpersonateTarget={false}
        canShowAdminShortcuts={false}
      />,
    );

    await openMenu(user);
    expect(screen.queryByText("Zugriff bearbeiten")).not.toBeInTheDocument();
    expect(screen.queryByText("Detailseite")).not.toBeInTheDocument();
  });

  it("R7 — normal actions use foreground styling (not disabled)", async () => {
    const user = userEvent.setup();
    render(
      <UserRowActionsMenu
        {...BASE_PROPS}
        canManageMembership={true}
        canGlobalDelete={false}
        canImpersonateTarget={false}
        canShowAdminShortcuts={true}
        onEditAccess={vi.fn()}
      />,
    );

    await openMenu(user);
    const edit = screen.getByRole("menuitem", { name: /zugriff bearbeiten/i });
    expect(edit).not.toHaveAttribute("disabled");
    expect(edit.className).toContain("foreground");
    expect(edit.className).not.toMatch(/opacity-40|text-\[var\(--muted\)\]/);
  });

  it("R7 — menu closes after selecting a normal action", async () => {
    const user = userEvent.setup();
    const onEditAccess = vi.fn();
    render(
      <UserRowActionsMenu
        {...BASE_PROPS}
        canManageMembership={true}
        canGlobalDelete={false}
        canShowAdminShortcuts={true}
        onEditAccess={onEditAccess}
      />,
    );

    await openMenu(user);
    await user.click(screen.getByRole("menuitem", { name: /zugriff bearbeiten/i }));
    expect(screen.queryByRole("menu", { name: /benutzeraktionen/i })).not.toBeInTheDocument();
    expect(onEditAccess).toHaveBeenCalledWith(BASE_PROPS.userId);
  });

  it("2. Returns null when neither canManageMembership nor canGlobalDelete", () => {
    const { container } = render(
      <UserRowActionsMenu
        {...BASE_PROPS}
        canManageMembership={false}
        canGlobalDelete={false}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("3. Ordinary tenant user without authority sees no ••• menu", () => {
    render(
      <UserRowActionsMenu
        {...BASE_PROPS}
        canManageMembership={false}
        canGlobalDelete={false}
      />,
    );
    expect(screen.queryByRole("button", { name: /mehr aktionen/i })).not.toBeInTheDocument();
  });

  it("7. Global delete is hidden from Club Admin (canGlobalDelete=false)", async () => {
    const user = userEvent.setup();
    render(
      <UserRowActionsMenu
        {...BASE_PROPS}
        canManageMembership={true}
        canGlobalDelete={false}
      />,
    );

    await openMenu(user);
    expect(screen.queryByText(/endgültig löschen/i)).not.toBeInTheDocument();
  });

  it("8. Platform global delete link is present for platform-authorized user", async () => {
    const user = userEvent.setup();
    render(
      <UserRowActionsMenu
        {...BASE_PROPS}
        canManageMembership={false}
        canGlobalDelete={true}
      />,
    );

    await openMenu(user);
    const link = screen.getByText(/endgültig löschen/i).closest("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", `/dashboard/users/${BASE_PROPS.userId}`);
  });

  it("9. Pending invitation row shows 'Einladung widerrufen', not membership removal", async () => {
    const user = userEvent.setup();
    render(
      <UserRowActionsMenu
        {...BASE_PROPS}
        pendingInvitation={true}
        canManageMembership={true}
        canGlobalDelete={false}
      />,
    );

    await openMenu(user);
    expect(screen.getByText("Einladung widerrufen")).toBeInTheDocument();
    expect(screen.queryByText("Aus Verein entfernen")).not.toBeInTheDocument();
  });

  it("9b. Pending invitation: clicking action opens revoke dialog (not removal dialog)", async () => {
    const user = userEvent.setup();
    render(
      <UserRowActionsMenu
        {...BASE_PROPS}
        pendingInvitation={true}
        canManageMembership={true}
        canGlobalDelete={false}
      />,
    );

    await openMenu(user);
    await user.click(screen.getByText("Einladung widerrufen"));

    expect(screen.getByRole("dialog", { name: /einladung widerrufen/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /aus verein entfernen/i })).not.toBeInTheDocument();
  });
});
