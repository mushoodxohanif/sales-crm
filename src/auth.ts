import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authConfig } from "@/auth.config";
import {
  getAllowedWorkspaceDomains,
  getPrimaryWorkspaceDomain,
  isAllowedWorkspaceUser,
} from "@/lib/auth/domains";
import { db } from "@/lib/db";
import { ensureUserNotificationPreferences } from "@/lib/notifications/preferences";

const primaryDomain = getPrimaryWorkspaceDomain();
const allowedDomains = getAllowedWorkspaceDomains();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          ...(primaryDomain && allowedDomains.length === 1 ? { hd: primaryDomain } : {}),
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider !== "google") {
        return false;
      }

      if (!isAllowedWorkspaceUser(profile)) {
        return "/?error=AccessDenied";
      }

      const googleId = profile?.sub;
      const email = profile?.email;

      if (!googleId || !email) {
        return false;
      }

      const user = await db.user.upsert({
        where: { googleId },
        create: {
          googleId,
          email,
          name: profile.name ?? null,
          image: profile.picture ?? null,
        },
        update: {
          email,
          name: profile.name ?? null,
          image: profile.picture ?? null,
        },
        select: { id: true },
      });

      await ensureUserNotificationPreferences(user.id);

      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && profile?.sub) {
        const user = await db.user.findUnique({
          where: { googleId: profile.sub },
          select: { id: true },
        });

        if (user) {
          token.sub = user.id;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;

        const user = await db.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });

        if (user) {
          session.user.role = user.role;
        }
      }

      return session;
    },
  },
});
