// Auth.js v5 + Prisma adapter
// Modes supportés :
//  - Production : magic link via Resend (default)
//  - Demo (DEMO_MODE=true) : Credentials provider sans mot de passe (1-clic)
//  - SSO Google : si AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET configurés
//  - SSO Microsoft : si AUTH_MICROSOFT_ENTRA_ID_ID + ID_SECRET + ID_ISSUER
//
// Le user qui se connecte via SSO doit deja exister en BDD (matche par email).
// Cela evite la creation sauvage de comptes — l'admin doit avoir invite l'user
// au prealable. Si on veut auto-create plus tard, c'est dans le callback signIn.
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { db } from "@/lib/db";

const isDemoMode = process.env.DEMO_MODE === "true";

const providers: any[] = [];

// SSO Google — actif si la config est presente
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // On ne demande que profile + email
      authorization: {
        params: { scope: "openid email profile", prompt: "select_account" },
      },
    }),
  );
}

// SSO Microsoft / Entra ID — actif si la config est presente
if (
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      // "common" = multi-tenant, "organizations" = comptes pro uniquement.
      // Pour PME on prefere "organizations" pour eviter les comptes perso.
      issuer:
        process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ??
        "https://login.microsoftonline.com/organizations/v2.0",
    }),
  );
}

// Demo provider : connecte sans mot de passe pour les démos live
if (isDemoMode) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials: Record<string, unknown> | undefined) {
        const email = credentials?.email as string | undefined;
        if (!email) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;
        // Refuse les comptes suspendus
        if (!user.isActive) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  );
}

// Magic link en prod
if (
  process.env.RESEND_API_KEY &&
  process.env.RESEND_API_KEY !== "demo-key-not-used-in-demo-mode"
) {
  providers.push(
    Resend({
      from: process.env.EMAIL_FROM!,
      apiKey: process.env.RESEND_API_KEY!,
      sendVerificationRequest: async (params: {
        identifier: string;
        url: string;
        provider: { apiKey?: string; from?: string };
      }) => {
        const { identifier, url, provider } = params;
        // Verifier que l'utilisateur n'est pas suspendu avant l'envoi
        const u = await db.user.findUnique({ where: { email: identifier } });
        if (u && !u.isActive) {
          throw new Error("Compte suspendu : contactez votre administrateur.");
        }
        const { Resend: ResendSDK } = await import("resend");
        const resend = new ResendSDK(provider.apiKey as string);
        await resend.emails.send({
          from: provider.from as string,
          to: identifier,
          subject: "🦊 Hex t'invite à entrer dans Humanix Académie",
          html: magicLinkEmailHTML(url),
        });
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: isDemoMode ? "jwt" : "database" },
  trustHost: true,
  pages: {
    signIn: isDemoMode ? "/demo" : "/connexion",
    verifyRequest: "/connexion/verification",
  },
  providers,
  callbacks: {
    /**
     * Callback signIn : controle d'acces avant creation/upsert de l'user
     * dans la BDD. Pour les providers SSO (Google/Microsoft), on REFUSE la
     * connexion si l'email ne correspond pas a un user deja existant en BDD
     * (les invitations restent gerees par l'admin). C'est plus sur que
     * d'auto-creer des comptes au passage : un employe externe ne peut pas
     * s'inviter avec le mauvais domaine email.
     */
    async signIn({
      user,
      account,
    }: {
      user: { email?: string | null; id?: string };
      account: { provider: string } | null;
    }) {
      // Demo mode + magic link : on laisse Auth.js gerer (Credentials a deja
      // verifie isActive dans authorize, magic link n'a pas besoin)
      if (account?.provider === "demo" || account?.provider === "resend") {
        return true;
      }

      // Providers SSO : on exige que l'email existe en BDD avec isActive=true
      if (
        account?.provider === "google" ||
        account?.provider === "microsoft-entra-id"
      ) {
        if (!user.email) return false;
        const existing = await db.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { id: true, isActive: true },
        });
        if (!existing) {
          // Pas de compte → refus avec redirection vers une page d'erreur
          return "/connexion?error=NoAccount";
        }
        if (!existing.isActive) {
          return "/connexion?error=AccountSuspended";
        }
        return true;
      }

      return true;
    },

    async jwt({
      token,
      user,
    }: {
      token: Record<string, unknown>;
      user?: { id?: string };
    }) {
      if (user) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id as string },
          select: {
            id: true,
            tenantId: true,
            role: true,
            name: true,
            isActive: true,
          },
        });
        if (dbUser && dbUser.isActive) {
          token.uid = dbUser.id;
          token.tenantId = dbUser.tenantId;
          token.role = dbUser.role;
          token.name = dbUser.name;
        }
      }
      return token;
    },
    async session({
      session,
      user,
      token,
    }: {
      session: { user?: { id?: string; name?: string | null; email?: string | null } };
      user?: { id: string };
      token?: Record<string, unknown>;
    }) {
      if (session.user) {
        if (token) {
          session.user!.id = token.uid as string;
          session.user!.tenantId = token.tenantId as string;
          session.user!.role = token.role as string;
          session.user.name = (token.name as string) ?? session.user.name;
        } else if (user) {
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { tenantId: true, role: true, name: true, isActive: true },
          });
          if (dbUser && dbUser.isActive) {
            session.user!.id = user.id;
            session.user!.tenantId = dbUser.tenantId;
            session.user!.role = dbUser.role;
            session.user.name = dbUser.name ?? session.user.name;
          }
        }
      }
      return session;
    },
  },
});

function magicLinkEmailHTML(url: string): string {
  return `
<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #EAF3F8; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; text-align: center;">
    <div style="font-size: 48px;">🦊</div>
    <h1 style="color: #0B3D91; margin: 16px 0 8px;">Bienvenue !</h1>
    <p style="color: #555; line-height: 1.6;">Salut, c'est Hex. Clique sur le bouton pour entrer dans ton univers Humanix Académie.</p>
    <a href="${url}" style="display: inline-block; margin: 24px 0; background: #00A3A1; color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: bold;">Entrer maintenant →</a>
    <p style="color: #999; font-size: 13px;">Ce lien expire dans 24h.</p>
  </div>
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">Humanix Académie by Humanix Cybersecurity</p>
</body></html>`;
}
