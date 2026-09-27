"use client";

const INSTALLATION_STORAGE_KEY = "sce.push.installationId";

function randomInstallationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `inst-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreatePushInstallationId(): string {
  if (typeof window === "undefined") return randomInstallationId();
  const existing = window.localStorage.getItem(INSTALLATION_STORAGE_KEY);
  if (existing?.trim()) return existing.trim();
  const created = randomInstallationId();
  window.localStorage.setItem(INSTALLATION_STORAGE_KEY, created);
  return created;
}

export type RegisterWebPushDeviceInput = {
  subscription: PushSubscriptionJSON;
};

/**
 * Contextual Web Push registration — caller must obtain Notification permission first.
 * Does not prompt for permission itself.
 */
export async function registerWebPushDevice(
  input: RegisterWebPushDeviceInput,
): Promise<Response> {
  const installationId = getOrCreatePushInstallationId();
  return fetch("/api/push/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      installationId,
      platform: "WEB",
      subscription: input.subscription,
    }),
  });
}

export async function revokeCurrentWebPushDevice(registrationId: string): Promise<Response> {
  return fetch(`/api/push/devices/${registrationId}`, { method: "DELETE" });
}
