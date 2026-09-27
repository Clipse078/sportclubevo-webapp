"use client";

import { SCE_PUSH_SERVICE_WORKER_PATH } from "@/lib/push/client/push-sw-constants";

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

export type WebPushEnableResult =
  | { ok: true }
  | { ok: false; reason: "NOT_SUPPORTED" | "NOT_CONFIGURED" | "DENIED" | "NOT_GRANTED" | "SUBSCRIPTION_FAILED" | "REGISTRATION_FAILED" };

export function isWebPushSupportedInBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPushNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Request notification permission — invoke only from an explicit user gesture
 * (e.g. "Push-Benachrichtigungen aktivieren").
 */
export async function requestPushNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isWebPushSupportedInBrowser()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isWebPushSupportedInBrowser()) return null;
  return navigator.serviceWorker.register(SCE_PUSH_SERVICE_WORKER_PATH, { scope: "/" });
}

export async function fetchWebPushVapidPublicKey(): Promise<{ enabled: boolean; publicKey: string | null }> {
  const response = await fetch("/api/push/vapid-public-key");
  if (!response.ok) {
    return { enabled: false, publicKey: null };
  }
  const body = (await response.json()) as { enabled?: boolean; publicKey?: string | null };
  return {
    enabled: Boolean(body.enabled && body.publicKey),
    publicKey: body.publicKey ?? null,
  };
}

export async function subscribeToWebPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!isWebPushSupportedInBrowser()) return null;
  const registration = await registerPushServiceWorker();
  if (!registration) return null;
  await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: Uint8Array.from(urlBase64ToUint8Array(vapidPublicKey)),
  });
}

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

/**
 * End-to-end enablement for a future settings control — requires a user gesture before calling.
 */
export async function enableWebPushNotifications(): Promise<WebPushEnableResult> {
  if (!isWebPushSupportedInBrowser()) {
    return { ok: false, reason: "NOT_SUPPORTED" };
  }
  const vapid = await fetchWebPushVapidPublicKey();
  if (!vapid.enabled || !vapid.publicKey) {
    return { ok: false, reason: "NOT_CONFIGURED" };
  }
  const permission = await requestPushNotificationPermission();
  if (permission === "unsupported") return { ok: false, reason: "NOT_SUPPORTED" };
  if (permission === "denied") return { ok: false, reason: "DENIED" };
  if (permission !== "granted") return { ok: false, reason: "NOT_GRANTED" };

  const subscription = await subscribeToWebPush(vapid.publicKey);
  if (!subscription) return { ok: false, reason: "SUBSCRIPTION_FAILED" };

  const response = await registerWebPushDevice({ subscription: subscription.toJSON() });
  if (!response.ok) return { ok: false, reason: "REGISTRATION_FAILED" };
  return { ok: true };
}

export async function unsubscribeLocalWebPushSubscription(): Promise<void> {
  if (!isWebPushSupportedInBrowser()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration(SCE_PUSH_SERVICE_WORKER_PATH);
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch {
    // Best-effort local cleanup on logout / account switch.
  }
}

export async function revokeCurrentWebPushDevice(registrationId: string): Promise<Response> {
  return fetch(`/api/push/devices/${registrationId}`, { method: "DELETE" });
}
