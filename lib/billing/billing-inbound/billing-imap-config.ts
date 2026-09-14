export type BillingImapConfigReadiness = {
  enabled: boolean;
  hostConfigured: boolean;
  portConfigured: boolean;
  userConfigured: boolean;
  passwordConfigured: boolean;
  tlsConfigured: boolean;
};

export class BillingImapConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingImapConfigurationError";
  }
}

export type BillingImapConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
};

function parsePort(raw: string | undefined): number | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const port = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return null;
  }
  return port;
}

function parseTls(raw: string | undefined): boolean | null {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "1" || normalized === "true" || normalized === "yes") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no") return false;
  return null;
}

function isInboundEnabled(env: NodeJS.ProcessEnv): boolean {
  const raw = env.BILLING_INBOUND_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function getBillingImapConfigReadiness(
  env: NodeJS.ProcessEnv = process.env,
): BillingImapConfigReadiness {
  const tls = parseTls(env.BILLING_IMAP_TLS);
  return {
    enabled: isInboundEnabled(env),
    hostConfigured: Boolean(env.BILLING_IMAP_HOST?.trim()),
    portConfigured: parsePort(env.BILLING_IMAP_PORT) !== null,
    userConfigured: Boolean(
      env.BILLING_IMAP_USER?.trim() || env.BILLING_SMTP_USER?.trim(),
    ),
    passwordConfigured: Boolean(
      env.BILLING_IMAP_PASSWORD?.trim() || env.BILLING_SMTP_PASSWORD?.trim(),
    ),
    tlsConfigured: tls !== null,
  };
}

export function requireBillingImapConfig(
  env: NodeJS.ProcessEnv = process.env,
): BillingImapConfig {
  const readiness = getBillingImapConfigReadiness(env);
  if (!readiness.enabled) {
    throw new BillingImapConfigurationError("Billing inbound IMAP is disabled.");
  }

  const missing: string[] = [];
  if (!readiness.hostConfigured) missing.push("BILLING_IMAP_HOST");
  if (!readiness.portConfigured) missing.push("BILLING_IMAP_PORT");
  if (!readiness.userConfigured) missing.push("BILLING_IMAP_USER");
  if (!readiness.passwordConfigured) missing.push("BILLING_IMAP_PASSWORD");
  if (!readiness.tlsConfigured) missing.push("BILLING_IMAP_TLS");

  if (missing.length > 0) {
    throw new BillingImapConfigurationError(
      `Billing inbound IMAP is not fully configured (missing: ${missing.join(", ")}).`,
    );
  }

  const host = env.BILLING_IMAP_HOST!.trim();
  const port = parsePort(env.BILLING_IMAP_PORT)!;
  const user = (env.BILLING_IMAP_USER?.trim() || env.BILLING_SMTP_USER)!.trim();
  const password = (env.BILLING_IMAP_PASSWORD?.trim() || env.BILLING_SMTP_PASSWORD)!.trim();
  const tls = parseTls(env.BILLING_IMAP_TLS)!;

  return { host, port, user, password, tls };
}
