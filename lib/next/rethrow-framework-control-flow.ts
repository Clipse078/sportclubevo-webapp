import { isRedirectError } from "next/dist/client/components/redirect-error";

/**
 * Next.js uses thrown errors for redirect() / notFound() control flow.
 * Server actions must re-throw these instead of mapping them to user-facing messages.
 */
export function rethrowFrameworkControlFlow(error: unknown): void {
  if (isRedirectError(error)) {
    throw error;
  }
}

export function actionErrorMessage(error: unknown, fallback: string): string {
  rethrowFrameworkControlFlow(error);
  return error instanceof Error ? error.message : fallback;
}
