"use client";

import { enableWebPushNotifications, type WebPushEnableResult } from "@/lib/push/client/push-registration-client";

/**
 * Reusable seam for a future "Push-Benachrichtigungen aktivieren" control.
 * Must be invoked from an explicit user interaction handler.
 */
export async function enableWebPushFromUserGesture(): Promise<WebPushEnableResult> {
  return enableWebPushNotifications();
}
