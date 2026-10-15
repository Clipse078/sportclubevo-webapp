import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import {
  authorizeCredentialsUser,
  type CredentialsInput,
} from "@/lib/auth/credentials-authorize";
import {
  applyTokenToSessionUser,
  applyTrustedJwtState,
  issueTrustedSessionUpdateIntent,
  revokeTrustedSessionUpdateIntent,
  trustedUpdatePayload,
} from "@/lib/auth/trusted-session-state";

const authResult = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const result = await authorizeCredentialsUser(
          prisma,
          (credentials ?? {}) as CredentialsInput,
        );
        if (!result.ok) {
          return null;
        }
        return result.user;
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      return applyTrustedJwtState({ token, user, trigger, session }, prisma);
    },
    session: async ({ session, token }) => {
      return applyTokenToSessionUser(session, token);
    },
  },
  trustHost: true,
});

export const { handlers, auth, signIn, signOut } = authResult;

async function runTrustedSessionUpdate(
  intent:
    | { kind: "start-impersonation"; actorUserId: string; targetUserId: string }
    | { kind: "stop-impersonation"; actorUserId: string }
    | { kind: "refresh-effective-user"; actorUserId: string },
) {
  const capability = issueTrustedSessionUpdateIntent(intent);
  try {
    return await authResult.unstable_update(
      trustedUpdatePayload(capability) as never,
    );
  } finally {
    revokeTrustedSessionUpdateIntent(capability);
  }
}

export function startImpersonationSession(
  actorUserId: string,
  targetUserId: string,
) {
  return runTrustedSessionUpdate({
    kind: "start-impersonation",
    actorUserId,
    targetUserId,
  });
}

export function stopImpersonationSession(actorUserId: string) {
  return runTrustedSessionUpdate({
    kind: "stop-impersonation",
    actorUserId,
  });
}

export function refreshEffectiveUserSession(actorUserId: string) {
  return runTrustedSessionUpdate({
    kind: "refresh-effective-user",
    actorUserId,
  });
}
