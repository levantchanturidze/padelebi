import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

// Route prefixes that require a specific role.
const ROLE_GATES: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["PLATFORM_ADMIN"] },
  { prefix: "/club", roles: ["CLUB_ADMIN", "PLATFORM_ADMIN"] },
  { prefix: "/account", roles: ["PLAYER", "CLUB_ADMIN", "PLATFORM_ADMIN"] },
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const gate = ROLE_GATES.find((g) => pathname.startsWith(g.prefix));
  if (!gate) return NextResponse.next();

  const user = req.auth?.user;
  if (!user) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (!gate.roles.includes(user.role)) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/club/:path*", "/account/:path*"],
};
