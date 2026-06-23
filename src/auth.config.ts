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
      const isOAuthAuthorize = nextUrl.pathname === "/oauth/authorize";
      const isOAuthTokenEndpoint = nextUrl.pathname === "/oauth/token";
      const isOAuthRevokeEndpoint = nextUrl.pathname === "/oauth/revoke";
      const isIntegrationApi = nextUrl.pathname.startsWith("/api/v1/");

      if (
        isAuthRoute ||
        isLandingPage ||
        isOAuthAuthorize ||
        isOAuthTokenEndpoint ||
        isOAuthRevokeEndpoint ||
        isIntegrationApi
      ) {
        return true;
      }

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
