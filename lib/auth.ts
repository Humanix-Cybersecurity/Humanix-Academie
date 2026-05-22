// SPDX-License-Identifier: AGPL-3.0-or-later
// Auth.js v5 + Prisma adapter
// Modes supportés :
//  - Production : magic link via Scaleway TEM (souverain FR) + login mot de passe
//  - Demo (DEMO_MODE=true) : Credentials provider sans mot de passe (1-clic)
//  - SSO Google : si AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET configurés
//  - SSO Microsoft : si AUTH_MICROSOFT_ENTRA_ID_ID + ID_SECRET + ID_ISSUER
//  - Login mot de passe + 2FA TOTP : actif dès qu'un user a defini un mdp
//
// Le user qui se connecte via SSO doit deja exister en BDD (matche par email).
// Cela evite la creation sauvage de comptes - l'admin doit avoir invite l'user
// au prealable. Si on veut auto-create plus tard, c'est dans le callback signIn.
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/nodemailer";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Apple from "next-auth/providers/apple";
import type { Provider } from "next-auth/providers";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { fireAndForgetAutoAssign } from "@/lib/onboarding/auto-assign";
import { verifyTotpCode } from "@/lib/totp";
import { consumeBackupCode } from "@/lib/password";
import { auditLog, AuditActions, AuditOutcomes } from "@/lib/audit";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import {
  COMMUNITY_TENANT_SLUG,
  getCommunityTenant,
} from "@/lib/tenant-community";
import { readInscriptionIntent } from "@/lib/inscription-intent";
import { isDevMode } from "@/lib/dev-mode";

const isDemoMode = process.env.DEMO_MODE === "true";

/**
 * Chemin vers la page de connexion adaptee a l'environnement.
 * - DEMO_MODE=true  -> "/demo"     (selecteur de comptes fictifs)
 * - DEMO_MODE=false -> "/connexion" (formulaire email/password reel)
 *
 * A utiliser dans les server components qui font `redirect(...)` quand
 * la session est absente. NE JAMAIS hardcoder "/demo" : en prod
 * commerciale (DEMO_MODE off), /demo renvoie 404 (cf. app/demo/layout.tsx).
 */
export function getSignInPath(): string {
  return isDemoMode ? "/demo" : "/connexion";
}

// Lockout : 5 echecs en 15 min => verrouille 15 min
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const providers: Provider[] = [];

// SSO Google - actif si la config est presente
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

// SSO Microsoft / Entra ID - actif si la config est presente
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

// SSO Apple - actif si la config est presente.
// Apple "Sign in with Apple" : la `clientSecret` est un JWT signé ES256 que
// l'admin doit régénérer périodiquement (validité max 6 mois cf. Apple Dev
// Portal). Soit on injecte un JWT pré-généré via AUTH_APPLE_SECRET, soit
// on le calcule au runtime à partir de la clé .p8 — pour l'instant on
// reste sur un JWT statique (cohérent avec Google/Microsoft).
if (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET) {
  providers.push(
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
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
      async authorize(credentials: any) {
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

// Dev-bypass provider : utilise par les flows inscription / souscription
// quand DEV_MODE=true (jamais en prod, cf. lib/dev-mode.ts). Permet de
// simuler le clic sur le magic link sans envoyer d'email, et de finaliser
// la souscription Mollie sans configurer de compte provider.
//
// SECURITE : la verification NODE_ENV != "production" est dans isDevMode().
// Ici on rajoute un garde-fou de creation : un user ne peut etre cree par
// ce provider que si le cookie d'intention d'inscription est valide
// (community-learner). Sinon on refuse, exactement comme le PrismaAdapter
// override pour les autres providers.
if (isDevMode()) {
  providers.push(
    Credentials({
      id: "dev-bypass",
      name: "Dev bypass",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials: any) {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        if (!email || !email.includes("@")) return null;

        let user = await db.user.findUnique({ where: { email } });

        if (!user) {
          // User inconnu : on ne cree que dans le contexte d'une inscription
          // explicite (cookie d'intention pose par /inscription). Pour une
          // souscription Mollie en DEV_MODE, le tenant + admin sont crees
          // par /api/payments/checkout/start AVANT signIn -> user existe deja.
          const intent = await readInscriptionIntent();
          if (intent !== "community-learner") {
            console.warn(
              "[dev-bypass] user inconnu sans cookie d'inscription → refus",
            );
            return null;
          }
          const community = await getCommunityTenant();
          if (!community) {
            console.error(
              `[dev-bypass] Tenant '${COMMUNITY_TENANT_SLUG}' absent. Run npm run db:seed.`,
            );
            return null;
          }
          user = await db.user.create({
            data: {
              email,
              tenantId: community.id,
              role: "LEARNER",
              isActive: true,
              emailVerified: new Date(),
            },
          });
          console.warn(
            `[dev-bypass] user LEARNER cree pour ${email} (tenant Communaute)`,
          );
        } else if (!user.isActive) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  );
}

// =====================================================
// CREDENTIALS PROVIDER : login mot de passe + 2FA TOTP
// =====================================================
// Toujours actif (hors demo mode). N'authentifie que les users qui ont
// effectivement defini un passwordHash. Ce provider est universellement
// disponible : les autres voies (magic link, SSO) restent en parallele.
//
// Champ "mfaCode" (optionnel) pour la 2FA :
//  - Si mfaEnabled=false → ignore
//  - Si mfaEnabled=true → exige soit un code TOTP, soit un code de secours
//
// Lockout : on incremente failedLoginAttempts a chaque echec, on verrouille
// 15 minutes apres MAX_FAILED_ATTEMPTS echecs consecutifs.
if (!isDemoMode) {
  providers.push(
    Credentials({
      id: "password",
      name: "Email + mot de passe",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        mfaCode: { label: "Code 2FA", type: "text" },
      },
      async authorize(credentials: any) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        const mfaCode = String(credentials?.mfaCode ?? "").trim();
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;
        if (!user.isActive) return null;
        if (!user.passwordHash) return null;

        // Lockout
        const now = new Date();
        if (user.lockedUntil && user.lockedUntil > now) {
          throw new Error("AccountLocked");
        }

        const passwordOk = verifyPassword(password, user.passwordHash);
        if (!passwordOk) {
          await registerFailedLogin(user.id, user.failedLoginAttempts);
          return null;
        }

        // Mot de passe OK. Maintenant la 2FA si activee.
        if (user.mfaEnabled && user.mfaSecret) {
          if (!mfaCode) {
            // Premier passage : on signale au front qu'il faut un code 2FA.
            // Auth.js retourne null = echec generique, on utilise une erreur
            // dediee que l'UI saura interpreter.
            throw new Error("MfaRequired");
          }
          const totpOk = verifyTotpCode(user.mfaSecret, mfaCode);
          if (!totpOk) {
            // Tentative code de secours (10 chars formattes XXXXX-XXXXX)
            const isBackupShape = /^[0-9A-Z]{5}-?[0-9A-Z]{5}$/i.test(mfaCode);
            if (isBackupShape && user.mfaBackupCodesHash) {
              const consumed = consumeBackupCode(
                mfaCode,
                user.mfaBackupCodesHash,
              );
              if (!consumed) {
                await registerFailedLogin(user.id, user.failedLoginAttempts);
                throw new Error("MfaInvalid");
              }
              await db.user.update({
                where: { id: user.id },
                data: { mfaBackupCodesHash: consumed.newHashedJson },
              });
            } else {
              await registerFailedLogin(user.id, user.failedLoginAttempts);
              throw new Error("MfaInvalid");
            }
          }
        }

        // Succes : reset compteur + lastLogin
        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });
        await auditLog({
          action: AuditActions.USER_LOGIN_SUCCESS,
          outcome: AuditOutcomes.SUCCESS,
          actor: {
            userId: user.id,
            email: user.email,
            role: user.role,
          },
          tenantId: user.tenantId,
          target: { type: "user", id: user.id, label: user.email },
          message: `Connexion par mot de passe${user.mfaEnabled ? " + 2FA" : ""}`,
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  );
}

// =====================================================
// WEBAUTHN PROVIDER
// =====================================================
// Pour finaliser une session NextAuth apres une auth FIDO2 reussie
// (cf. /api/webauthn/login/verify qui a deja valide la cle et pose
// le cookie wac_fresh).
//
// Le client appelle signIn("webauthn", { email }) APRES avoir confirme
// la cle, en passant l'email + le freshToken signe (recu du verify).
// On revalide ici cote server le freshToken pour eviter qu'un attaquant
// court-circuite cette etape.
import { verifyFreshAuth } from "@/lib/webauthn";

if (!isDemoMode) {
  providers.push(
    Credentials({
      id: "webauthn",
      name: "Cle de securite",
      credentials: {
        email: { label: "Email", type: "email" },
        // Le token "fresh-auth" recu via cookie HTTPOnly est lu cote
        // server dans le callback signIn. On expose l'email + un marker
        // pour que ce provider fonctionne avec signIn().
        marker: { label: "Marker", type: "text" },
      },
      async authorize(credentials: any, request: any) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        if (!email) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;

        // On lit le cookie fresh-auth a la main car ce provider est appele
        // depuis le serveur (request.headers.cookie).
        const cookieHeader =
          (request?.headers?.get?.("cookie") as string | null) ?? "";
        const match = cookieHeader.match(/wac_fresh=([^;]+)/);
        const freshToken = match ? decodeURIComponent(match[1]) : "";
        if (!freshToken || !verifyFreshAuth(freshToken, user.id)) {
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });
        await auditLog({
          action: AuditActions.USER_WEBAUTHN_LOGIN,
          outcome: AuditOutcomes.SUCCESS,
          actor: { userId: user.id, email: user.email, role: user.role },
          tenantId: user.tenantId,
          target: { type: "user", id: user.id, label: user.email },
          message: "Connexion par cle FIDO2",
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  );
}

async function registerFailedLogin(userId: string, current: number) {
  const next = current + 1;
  const data: { failedLoginAttempts: number; lockedUntil?: Date } = {
    failedLoginAttempts: next,
  };
  const willLock = next >= MAX_FAILED_ATTEMPTS;
  if (willLock) {
    data.lockedUntil = new Date(Date.now() + LOCKOUT_MS);
  }
  const updated = await db.user.update({
    where: { id: userId },
    data,
    select: { email: true, tenantId: true },
  });
  await auditLog({
    action: AuditActions.USER_LOGIN_FAILED,
    outcome: AuditOutcomes.FAILURE,
    actor: { userId, email: updated.email },
    tenantId: updated.tenantId,
    target: { type: "user", id: userId, label: updated.email },
    message: `Tentative ${next}/${MAX_FAILED_ATTEMPTS}${willLock ? " - compte verrouillé" : ""}`,
  });
  if (willLock) {
    await auditLog({
      action: AuditActions.USER_LOCKED,
      outcome: AuditOutcomes.SUCCESS,
      actor: { userId, email: updated.email },
      tenantId: updated.tenantId,
      target: { type: "user", id: userId, label: updated.email },
      message: `Verrouillage automatique après ${MAX_FAILED_ATTEMPTS} échecs`,
    });
  }
}

// Magic link en prod (envoi via Scaleway TEM, cf. lib/email/)
// On utilise le provider Email "nodemailer" de NextAuth comme harness pour
// les VerificationToken, mais on bypass le SMTP via sendVerificationRequest
// custom qui appelle notre facade lib/email.
if (isEmailConfigured()) {
  providers.push(
    EmailProvider({
      from: process.env.EMAIL_FROM!,
      // server est requis par le typing mais jamais utilise puisqu'on
      // overrides sendVerificationRequest. On passe un objet vide.
      server: { host: "smtp.invalid", port: 25, auth: { user: "", pass: "" } },
      sendVerificationRequest: async (params) => {
        const { identifier, url } = params;
        // Verifier que l'utilisateur n'est pas suspendu avant l'envoi
        const u = await db.user.findUnique({ where: { email: identifier } });
        if (u && !u.isActive) {
          throw new Error("Compte suspendu : contactez votre administrateur.");
        }
        const result = await sendEmail({
          to: identifier,
          subject: "🦊 Hex t'invite à entrer dans Humanix Académie",
          html: magicLinkEmailHTML(url),
          // Le magic link est transactionnel (l'utilisateur l'a explicitement
          // demande en se loguant ou en s'inscrivant). On injecte un header
          // List-Unsubscribe avec un mailto: pour satisfaire les checks
          // mail-tester / Gmail Postmaster sans casser la fonction (pas de
          // one-click, l'user ne peut pas se "desinscrire" d'un mail
          // d'authentification, sinon il ne pourrait plus se connecter).
          unsubscribe: { kind: "transactional" },
        });
        if (!result.ok) {
          throw new Error(`magic_link_send_failed:${result.reason}`);
        }
      },
    }) as Provider,
  );
}

// PrismaAdapter override : injecte tenantId + role lors de l'auto-création
// d'un user (SSO ou magic link inconnu).
//
// SECURITE :
//   - Refuse l'auto-création si AUCUN cookie d'intention valide n'est posé.
//     Ça maintient la sécurité existante : un employé ACME qui clique « Sign
//     in with Google » sur /connexion sans avoir été invité reste rejeté.
//   - Si cookie d'intention valide (posé par /inscription), l'user est
//     créé sur le tenant Communauté avec role LEARNER (le seul niveau d'accès
//     autorisé pour un signup non-payant).
const baseAdapter = PrismaAdapter(db);
const adapter: typeof baseAdapter = {
  ...baseAdapter,
  async createUser(data) {
    const intent = await readInscriptionIntent();
    if (intent !== "community-learner") {
      throw new Error(
        "Création de compte non autorisée sans flow d'inscription valide.",
      );
    }
    const community = await getCommunityTenant();
    if (!community) {
      throw new Error(
        `Tenant '${COMMUNITY_TENANT_SLUG}' absent. Exécute 'npm run db:seed'.`,
      );
    }
    const created = await db.user.create({
      data: {
        email: data.email,
        name: data.name ?? null,
        emailVerified: data.emailVerified ?? null,
        tenantId: community.id,
        role: "LEARNER",
        isActive: true,
      },
    });
    // Auto-assignation parcours obligatoire (fire-and-forget : on ne
    // bloque pas le signup public si l'auto-assign rate)
    void fireAndForgetAutoAssign(created.id, community.id);
    // Cast vers le type attendu par next-auth (notre User a des champs en plus
    // que le type AdapterUser, et tenantId / role / isActive ne sont pas dans
    // sa surface publique).
    return created as unknown as Awaited<ReturnType<NonNullable<typeof baseAdapter.createUser>>>;
  },
};

// Session strategy : "jwt" partout.
//
// HISTOIRE : on visait initialement "database" en prod (revocation immediate
// via DELETE FROM Session WHERE id=...). MAIS le provider password
// (Credentials) en prod est incompatible avec les sessions DB d'Auth.js v5 :
// l'authorize callback retourne un user mais ne cree pas la row Session que
// l'adapter attend. Resultat : login OK -> cookie JWE pose -> `auth()` cherche
// une row Session -> rien -> session = null -> redirect /connexion.
//
// Symptome utilisateur : "le formulaire de login ne fait rien, je reviens
// a /connexion sans message d'erreur".
//
// JWT partout est la solution propre tant qu'on a Credentials actif.
//
// TRADE-OFF : la revocation d'une seule session devient impossible avec
// JWT (le token est self-contained, valide jusqu'a expiration meme si l'user
// est deactive). Pour invalider une session compromise, deux options :
//   - rotation AUTH_SECRET : invalide TOUTES les sessions de l'instance
//   - reduire la duree de vie des JWT (cf. session.maxAge ci-dessous, defaut 30j)
// Une amelioration future serait d'ajouter un check `isActive` dans le jwt
// callback a chaque requete (cout : 1 query DB par request).
const useJwtSessions = true;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  session: { strategy: useJwtSessions ? "jwt" : "database" },
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
    // Note : on type les params `any` volontairement. Auth.js v5 beta.31
    // a des types très volatiles (ils changent quasi à chaque release) et
    // l'union `{ user, account } | { user, account, profile, ... }` est
    // imposée par le runtime. La règle `no-explicit-any` est désactivée
    // dans `.eslintrc.json` pour ce genre de cas légitime.
    async signIn(params: any) {
      const { user, account } = params;
      // Demo mode : Credentials provider (déjà validé isActive dans authorize)
      if (account?.provider === "demo") {
        return true;
      }
      // Dev-bypass : Credentials provider, validation deja faite dans authorize
      if (account?.provider === "dev-bypass") {
        return true;
      }

      // Providers SSO + magic link : si l'user existe et est actif → OK.
      // Sinon, on regarde le cookie d'intention pour distinguer :
      //   - Inscription (cookie valide) → autorise auto-create sur Communauté
      //   - Connexion classique (pas de cookie) → refuse (employé ACME qui
      //     tape /connexion sans invitation préalable)
      const isExternalProvider =
        account?.provider === "google" ||
        account?.provider === "microsoft-entra-id" ||
        account?.provider === "apple" ||
        account?.provider === "resend" ||
        account?.provider === "nodemailer";

      if (isExternalProvider) {
        if (!user.email) return false;
        const existing = await db.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: {
            id: true,
            isActive: true,
            tenant: { select: { isActive: true } },
          },
        });
        if (existing) {
          if (!existing.isActive) {
            return "/connexion?error=AccountSuspended";
          }
          // Si le tenant est desactive par le SUPERADMIN (paiement en retard,
          // demande client, abus, etc.), on refuse la connexion meme pour
          // un user actif. Message distinct pour ne pas exposer que c'est
          // le tenant qui est suspendu (info operationnelle confidentielle).
          if (existing.tenant && !existing.tenant.isActive) {
            return "/connexion?error=TenantSuspended";
          }
          return true;
        }
        // User inconnu : autoriser uniquement si cookie d'intention valide
        // (= passé par /inscription). Sinon redirect avec message clair.
        const intent = await readInscriptionIntent();
        if (intent === "community-learner") {
          return true; // PrismaAdapter override fera la création
        }
        return "/connexion?error=NoAccount";
      }

      return true;
    },

    async jwt(params: {
      token: {
        [key: string]: unknown;
        uid?: string;
        tenantId?: string;
        role?: string;
        name?: string | null;
      };
      user?: {
        id?: string;
      };
    }) {
      const { token, user } = params;
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
      } else if (token.uid) {
        const dbUser = await db.user.findUnique({
          where: { id: token.uid },
          select: {
            id: true,
            tenantId: true,
            role: true,
            name: true,
            isActive: true,
          },
        });
        if (!dbUser || !dbUser.isActive) {
          delete token.uid;
          delete token.tenantId;
          delete token.role;
          delete token.name;
        } else {
          token.uid = dbUser.id;
          token.tenantId = dbUser.tenantId;
          token.role = dbUser.role;
          token.name = dbUser.name;
        }
      }
      return token;
    },
    async session(params: any) {
      const { session, user, token } = params;
      if (session.user) {
        if (token) {
          session.user.id = token.uid as string;
          session.user.tenantId = token.tenantId as string;
          session.user.role = token.role as string;
          session.user.name = (token.name as string) ?? session.user.name;
        } else if (user) {
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { tenantId: true, role: true, name: true, isActive: true },
          });
          if (dbUser && dbUser.isActive) {
            session.user.id = user.id;
            session.user.tenantId = dbUser.tenantId;
            session.user.role = dbUser.role;
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
