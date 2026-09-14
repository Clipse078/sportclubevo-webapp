export type BillingSmtpEncryption = "STARTTLS" | "TLS";

export type BillingSmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  encryption: BillingSmtpEncryption;
};

export type BillingSmtpConfigReadiness = {
  hostConfigured: boolean;
  portConfigured: boolean;
  userConfigured: boolean;
  passwordConfigured: boolean;
  encryptionConfigured: boolean;
  encryption: BillingSmtpEncryption | null;
};

export class BillingSmtpConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingSmtpConfigurationError";
  }
}

function parseEncryption(raw: string | undefined): BillingSmtpEncryption | null {
  const normalized = raw?.trim().toUpperCase();
  if (normalized === "STARTTLS") return "STARTTLS";
  if (normalized === "TLS" || normalized === "SSL") return "TLS";
  return null;
}

function parsePort(raw: string | undefined): number | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const port = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return null;
  }
  return port;
}

export function getBillingSmtpConfigReadiness(
  env: NodeJS.ProcessEnv = process.env,
): BillingSmtpConfigReadiness {
  const encryption = parseEncryption(env.BILLING_SMTP_ENCRYPTION);
  return {
    hostConfigured: Boolean(env.BILLING_SMTP_HOST?.trim()),
    portConfigured: parsePort(env.BILLING_SMTP_PORT) !== null,
    userConfigured: Boolean(env.BILLING_SMTP_USER?.trim()),
    passwordConfigured: Boolean(env.BILLING_SMTP_PASSWORD?.trim()),
    encryptionConfigured: encryption !== null,
    encryption,
  };
}

export function requireBillingSmtpConfig(
  env: NodeJS.ProcessEnv = process.env,
): BillingSmtpConfig {
  const readiness = getBillingSmtpConfigReadiness(env);
  const missing: string[] = [];
  if (!readiness.hostConfigured) missing.push("BILLING_SMTP_HOST");
  if (!readiness.portConfigured) missing.push("BILLING_SMTP_PORT");
  if (!readiness.userConfigured) missing.push("BILLING_SMTP_USER");
  if (!readiness.passwordConfigured) missing.push("BILLING_SMTP_PASSWORD");
  if (!readiness.encryptionConfigured) missing.push("BILLING_SMTP_ENCRYPTION");

  if (missing.length > 0) {
    throw new BillingSmtpConfigurationError(
      `Billing SMTP is not fully configured (missing: ${missing.join(", ")}).`,
    );
  }

  const host = env.BILLING_SMTP_HOST!.trim();
  const port = parsePort(env.BILLING_SMTP_PORT)!;
  const user = env.BILLING_SMTP_USER!.trim();
  const password = env.BILLING_SMTP_PASSWORD!.trim();
  const encryption = readiness.encryption!;

  return { host, port, user, password, encryption };
}
