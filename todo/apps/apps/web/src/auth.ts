import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

import Google from "next-auth/providers/google";
import Keycloak from "next-auth/providers/keycloak";
import AzureAD from "next-auth/providers/azure-ad";
// import Email from "next-auth/providers/email"; // Uncomment if you want email auth

// Build providers array conditionally based on available env vars
const providers: any[] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (
  process.env.KEYCLOAK_ISSUER &&
  process.env.KEYCLOAK_CLIENT_ID &&
  process.env.KEYCLOAK_CLIENT_SECRET
) {
  providers.push(
    Keycloak({
      issuer: process.env.KEYCLOAK_ISSUER,
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    })
  );
}

if (
  process.env.AZURE_AD_CLIENT_ID &&
  process.env.AZURE_AD_CLIENT_SECRET &&
  process.env.AZURE_AD_TENANT_ID
) {
  providers.push(
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      // For Azure AD / Microsoft Entra ID, specify the tenant via the issuer URL
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
    })
  );
}

// If you want to enable email auth, ensure SMTP_* env vars are set and then uncomment:
// if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
//   providers.push(
//     Email({
//       server: {
//         host: process.env.SMTP_HOST,
//         port: parseInt(process.env.SMTP_PORT || "587"),
//         auth: {
//           user: process.env.SMTP_USER,
//           pass: process.env.SMTP_PASSWORD,
//         },
//       },
//       from: process.env.SMTP_FROM || '"Smart To-Do" <noreply@smarttodo.app>',
//     })
//   );
// }

export const {
  auth,
  handlers: { GET, POST },
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Use JWT sessions for simplicity on serverless. If you prefer DB sessions, change to "database".
  session: { strategy: "jwt" },
  // Support either AUTH_SECRET (Auth.js v5) or NEXTAUTH_SECRET (legacy)
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers,
  // Add any pages overrides if you have custom pages in src/app/auth/*
  // pages: {
  //   signIn: "/auth/signin",
  //   error: "/auth/error",
  // },
  callbacks: {
    async jwt({ token, account, user }) {
      // Persist tokens from OAuth providers
      if (account) {
        (token as any).accessToken = (account as any).access_token;
        (token as any).refreshToken = (account as any).refresh_token;
        (token as any).provider = account.provider;
      }
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).accessToken = (token as any).accessToken;
        (session.user as any).refreshToken = (token as any).refreshToken;
        (session.user as any).provider = (token as any).provider;
      }
      return session;
    },
  },
});
