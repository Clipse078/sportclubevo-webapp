/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  enableWebPushNotifications,
  getPushNotificationPermission,
  isWebPushSupportedInBrowser,
  registerPushServiceWorker,
  requestPushNotificationPermission,
  subscribeToWebPush,
} from "../push-registration-client";

function stubWebPushBrowser() {
  Object.defineProperty(window, "PushManager", { value: class {}, configurable: true });
  Object.defineProperty(window, "Notification", {
    value: { permission: "default", requestPermission: vi.fn().mockResolvedValue("granted") },
    configurable: true,
  });
  Object.defineProperty(navigator, "serviceWorker", {
    value: { register: vi.fn(), ready: Promise.resolve({}) },
    configurable: true,
  });
}

describe("push registration client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    stubWebPushBrowser();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not auto-request permission on read", () => {
    const request = vi.fn();
    Object.defineProperty(window, "Notification", {
      value: { permission: "default", requestPermission: request },
      configurable: true,
    });
    expect(getPushNotificationPermission()).toBe("default");
    expect(request).not.toHaveBeenCalled();
  });

  it("requests permission only when explicitly called", async () => {
    const request = vi.fn().mockResolvedValue("granted");
    Object.defineProperty(window, "Notification", {
      value: { permission: "default", requestPermission: request },
      configurable: true,
    });

    await requestPushNotificationPermission();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("returns DENIED when permission is denied without subscribing", async () => {
    Object.defineProperty(window, "Notification", {
      value: { permission: "denied", requestPermission: vi.fn() },
      configurable: true,
    });

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true, publicKey: "abc" }),
    });

    const result = await enableWebPushNotifications();
    expect(result).toEqual({ ok: false, reason: "DENIED" });
  });

  it("subscribes with VAPID key and registers device", async () => {
    const subscribe = vi.fn().mockResolvedValue({
      toJSON: () => ({ endpoint: "https://push.example/1", keys: {} }),
    });
    const registration = {
      pushManager: { getSubscription: vi.fn().mockResolvedValue(null), subscribe },
    };

    Object.defineProperty(window, "Notification", {
      value: { permission: "granted", requestPermission: vi.fn() },
      configurable: true,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        register: vi.fn().mockResolvedValue(registration),
        ready: Promise.resolve(registration),
      },
      configurable: true,
    });

    const vapidPublicKey =
      "BCWjLltxzoWF1pE4fluQ7s3mqW0Uz2OHlTjMMWugxrqp7ZKILiTLvHq4r1LYgrnspOFfxTeSf6Ai_YOs1XtCAuU";

    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ enabled: true, publicKey: vapidPublicKey }),
      })
      .mockResolvedValueOnce({ ok: true });

    const result = await enableWebPushNotifications();
    expect(result).toEqual({ ok: true });
    expect(subscribe).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith("/api/push/devices", expect.any(Object));
  });

  it("registers dedicated push service worker path", async () => {
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register },
      configurable: true,
    });

    expect(isWebPushSupportedInBrowser()).toBe(true);
    await registerPushServiceWorker();
    expect(register).toHaveBeenCalledWith("/sce-push-sw.js", { scope: "/" });
  });

  it("uses PushManager subscription flow", async () => {
    const subscribe = vi.fn().mockResolvedValue({ endpoint: "https://push.example/2" });
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe,
      },
    };
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        register: vi.fn().mockResolvedValue(registration),
        ready: Promise.resolve(registration),
      },
      configurable: true,
    });

    await subscribeToWebPush(
      "BCWjLltxzoWF1pE4fluQ7s3mqW0Uz2OHlTjMMWugxrqp7ZKILiTLvHq4r1LYgrnspOFfxTeSf6Ai_YOs1XtCAuU",
    );
    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
  });
});

describe("sce-push service worker", () => {
  it("handles push and notificationclick without offline caching", () => {
    const source = readFileSync(join(process.cwd(), "public/sce-push-sw.js"), "utf8");
    expect(source).toMatch(/addEventListener\("push"/);
    expect(source).toMatch(/showNotification/);
    expect(source).toMatch(/addEventListener\("notificationclick"/);
    expect(source).toMatch(/openWindow|focus/);
    expect(source).not.toMatch(/caches\.open/);
  });
});
