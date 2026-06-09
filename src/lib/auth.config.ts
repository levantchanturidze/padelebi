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
        token.role = (user as { role?: string }).role ?? "PLAYER";
        const remember = (user as { remember?: boolean }).remember ?? false;
        // 1 day unless "keep me signed in" is checked, then 30 days
        token.exp = Math.floor(Date.now() / 1000) + (remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60);
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
