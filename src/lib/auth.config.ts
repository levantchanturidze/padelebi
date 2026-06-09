import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth configuration shared by middleware and the full Node config.
 * Must NOT import Prisma or any Node-only modules.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    // Persist id + role onto the JWT at sign-in, expose on the session.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        // role is attached by the credentials authorize() return value
        token.role = (user as { role?: string }).role ?? "PLAYER";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  providers: [], // real providers added in src/lib/auth.ts (Node runtime)
} satisfies NextAuthConfig;
