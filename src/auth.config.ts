import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = Boolean(session?.user);
      const isLandingPage = nextUrl.pathname === "/";
      const isAuthRoute = nextUrl.pathname.startsWith("/api/auth");

      if (isAuthRoute || isLandingPage) {
        return true;
      }

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
