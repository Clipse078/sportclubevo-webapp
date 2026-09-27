import webpush from "web-push";
import { isExternalSideEffectConfigured } from "@/lib/server/external-side-effect-policy";
import type { PushPayload } from "@/lib/push/push-payload-builder";

export type PushSendInput = {
  subscriptionJson: string;
  payload: PushPayload;
  idempotencyKey: string;
};

export type PushSendResult = {
  providerMessageId: string;
};

export class PushProviderError extends Error {
  constructor(
    readonly code: string,
    readonly permanent: boolean,
    message: string,
  ) {
    super(message);
    this.name = "PushProviderError";
  }
}

export interface PushProvider {
  send(input: PushSendInput): Promise<PushSendResult>;
}

export function isWebPushConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return isExternalSideEffectConfigured("web-push", [
    "PUSH_VAPID_PUBLIC_KEY",
    "PUSH_VAPID_PRIVATE_KEY",
    "PUSH_VAPID_SUBJECT",
  ], env);
}

export class WebPushProvider implements PushProvider {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {
    const publicKey = env.PUSH_VAPID_PUBLIC_KEY?.trim();
    const privateKey = env.PUSH_VAPID_PRIVATE_KEY?.trim();
    const subject = env.PUSH_VAPID_SUBJECT?.trim();
    if (!publicKey || !privateKey || !subject) {
      throw new PushProviderError("NOT_CONFIGURED", true, "Web Push VAPID is not configured");
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  async send(input: PushSendInput): Promise<PushSendResult> {
    let subscription: webpush.PushSubscription;
    try {
      subscription = JSON.parse(input.subscriptionJson) as webpush.PushSubscription;
    } catch {
      throw new PushProviderError("INVALID_SUBSCRIPTION", true, "Invalid push subscription payload");
    }

    try {
      const result = await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: input.payload.title,
          body: input.payload.body,
          data: input.payload.data,
        }),
        {
          urgency: input.payload.priority === "high" ? "high" : "normal",
          TTL: 86400,
        },
      );
      return {
        providerMessageId: result.headers?.location ?? input.idempotencyKey,
      };
    } catch (error) {
      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof (error as { statusCode?: unknown }).statusCode === "number"
          ? (error as { statusCode: number }).statusCode
          : undefined;

      if (statusCode === 404 || statusCode === 410) {
        throw new PushProviderError("INVALID_TOKEN", true, "Push subscription is no longer valid");
      }
      if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
        throw new PushProviderError("PROVIDER_REJECTED", true, "Push provider rejected the request");
      }
      throw new PushProviderError(
        "PROVIDER_FAILURE",
        false,
        error instanceof Error ? error.message : "Push delivery failed",
      );
    }
  }
}

export class DisabledPushProvider implements PushProvider {
  async send(): Promise<PushSendResult> {
    throw new PushProviderError("NOT_CONFIGURED", true, "Push provider is disabled");
  }
}

let defaultProvider: PushProvider | null = null;

export function getPushProvider(env: NodeJS.ProcessEnv = process.env): PushProvider {
  if (!defaultProvider) {
    defaultProvider = isWebPushConfigured(env) ? new WebPushProvider(env) : new DisabledPushProvider();
  }
  return defaultProvider;
}

export function setPushProviderForTests(provider: PushProvider | null): void {
  defaultProvider = provider;
}

export function getWebPushPublicKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.PUSH_VAPID_PUBLIC_KEY?.trim() ?? null;
}
