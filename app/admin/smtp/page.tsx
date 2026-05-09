// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/smtp - Configuration du serveur SMTP du tenant.
//
// Pourquoi c'est ici et pas inclus dans le SaaS Humanix :
// Humanix-Cybersecurity NE PARTAGE PAS son SMTP (Scaleway TEM) pour les
// envois phishing simules. C'est volontaire :
//   - Les envois doivent être identifies au domaine du client (anti-confusion)
//   - Le client assume la responsabilite OPSEC (SPF/DKIM/DMARC, reputation IP)
//   - Un phishing simule envoye depuis l'IP Humanix pourrait casser notre
//     reputation pour les vrais envois transactionnels (magic links, etc.)
//
// Le client a 3 options :
//   1. Configurer son propre SMTP ici (gratuit, autonomie totale)
//   2. Utiliser un provider tiers (Brevo, Mailjet, Scaleway TEM client) et
//      renseigner ses credentials
//   3. Si pas envie de gerer l'OPSEC : nous contacter pour une PRESTATION
//      DE SERVICE FACTUREE AU FORFAIT (mise en place + suivi reputation)

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import SmtpConfigForm from "./SmtpConfigForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Configuration SMTP — Humanix Académie",
  description:
    "Configurer ton serveur SMTP pour envoyer les phishing simulés depuis ton propre domaine.",
  robots: { index: false, follow: false },
};

export default async function SmtpConfigPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }
  const tenantId = session.user!.tenantId as string;

  const cfg = await db.tenantSmtpConfig.findUnique({
    where: { tenantId },
    select: {
      host: true,
      port: true,
      secure: true,
      username: true,
      fromEmail: true,
      fromName: true,
      isVerified: true,
      lastVerifiedAt: true,
      lastError: true,
      notes: true,
      updatedAt: true,
    },
  });

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
          Paramètrès tenant
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
          Configuration SMTP
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
          Pour envoyer des phishing simulés à ton équipe, ton tenant doit
          utiliser <strong>son propre serveur SMTP</strong>. Humanix ne
          partage pas son infra mail : c&apos;est à chaque organisation de
          gérer son OPSEC (réputation IP, SPF, DKIM, DMARC) et la
          responsabilité légale des envois.
        </p>
      </header>

      {/* ===== EXPLICATION : 3 OPTIONS ===== */}
      <section
        aria-labelledby="options-title"
        className="rounded-2xl border-2 border-primary-200 dark:border-primary-900/40 bg-gradient-to-br from-primary-50 via-white to-cyan-50 dark:from-primary-950/30 dark:via-slate-900 dark:to-cyan-950/20 p-5 sm:p-6"
      >
        <h2
          id="options-title"
          className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 mb-3"
        >
          Trois options selon ton niveau d&apos;autonomie
        </h2>
        <ol className="space-y-3 text-sm text-gray-800 dark:text-gray-200">
          <li>
            <strong className="text-primary-500">
              1. Ton propre serveur SMTP
            </strong>{" "}
            (gratuit, autonomie totale) — tu utilises un Postfix self-host,
            un Mailcow, ou un compte Office 365 / Google Workspace dédié.
            Tu maîtrises tout : domaine, IP, réputation.
          </li>
          <li>
            <strong className="text-primary-500">
              2. Un provider transactionnel
            </strong>{" "}
            (Brevo, Mailjet, Scaleway TEM client, Mailgun…) — tu renseignes
            ici les credentials du compte client que tu as ouvert
            spécifiquement pour les phishing simulés. Coût : variable selon
            le provider, souvent gratuit en deçà de quelques centaines
            d&apos;envois/mois.
          </li>
          <li>
            <strong className="text-primary-500">3. Prestation Humanix</strong>{" "}
            — pas envie de gérer l&apos;OPSEC ? Nous contacter pour une mise
            en place complète facturée au forfait : SMTP dédié, délégation
            de domaine, suivi réputation.{" "}
            <Link
              href="/demande-abonnement?type=opsec"
              className="text-accent-700 dark:text-accent-300 underline font-medium"
            >
              Parlons-en →
            </Link>
          </li>
        </ol>
        <div className="mt-4 pt-4 border-t border-primary-200/60 dark:border-primary-900/30">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            🎯 <strong>Avant de configurer ton SMTP</strong>, lis notre
            cadrage{" "}
            <Link
              href="/opsec-phishing"
              className="text-accent-700 dark:text-accent-300 underline font-bold"
            >
              OPSEC du phishing simulé →
            </Link>{" "}
            (8 chantiers, 5 min de lecture). Tu sauras si tu es pret a
            assumer ou s&apos;il vaut mieux nous deleguer ca.
          </p>
        </div>
      </section>

      {/* ===== STATUT ACTUEL ===== */}
      {cfg && (
        <section
          aria-labelledby="status-title"
          className={`rounded-2xl border-2 p-5 sm:p-6 ${
            cfg.isVerified === true
              ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20"
              : cfg.isVerified === false
                ? "border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20"
                : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800"
          }`}
        >
          <h2
            id="status-title"
            className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 mb-2"
          >
            État de la connexion
          </h2>
          {cfg.isVerified === true && (
            <p className="text-sm text-emerald-800 dark:text-emerald-200">
              ✅ <strong>Connexion vérifiée</strong> avec succès le{" "}
              {cfg.lastVerifiedAt &&
                new Date(cfg.lastVerifiedAt).toLocaleString("fr-FR")}
              . Tu peux envoyer des phishing simulés.
            </p>
          )}
          {cfg.isVerified === false && (
            <div className="text-sm text-amber-900 dark:text-amber-100 space-y-2">
              <p>
                ⚠️ <strong>Le dernier test a échoué.</strong>{" "}
                {cfg.lastVerifiedAt &&
                  `Testé le ${new Date(cfg.lastVerifiedAt).toLocaleString("fr-FR")}.`}
              </p>
              {cfg.lastError && (
                <pre className="text-xs font-mono bg-white/70 dark:bg-slate-900/40 border border-amber-300 dark:border-amber-700 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
                  {cfg.lastError}
                </pre>
              )}
            </div>
          )}
          {cfg.isVerified === null && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              ⏳ Configuration enregistrée mais jamais testée. Clique sur
              &laquo;&nbsp;Tester la connexion&nbsp;&raquo; pour vérifier.
            </p>
          )}
        </section>
      )}

      {/* ===== FORMULAIRE ===== */}
      <SmtpConfigForm initial={cfg} />

      {/* ===== INFO LEGALE ===== */}
      <section className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/60 px-4 py-4 text-xs text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
        <p>
          <strong>🔐 Sécurité du password</strong> : le mot de passe est
          chiffré <code>AES-256-GCM</code> avec une clé dérivée de notre
          secret JWT (<code>AUTH_SECRET</code>). Il n&apos;est jamais
          retourné en clair via l&apos;API, même chiffré. Pour le modifier,
          re-saisis-le dans le formulaire.
        </p>
        <p>
          <strong>📜 Responsabilité légale</strong> : les phishing simulés
          envoyés depuis ton SMTP engagent ta responsabilité (RGPD, droit du
          travail, accord CSE/IRP recommandé). Humanix ne fait que fournir
          la plateforme et les templates pédagogiques.
        </p>
        <p>
          <strong>📊 Audit</strong> : chaque modification de cette
          configuration est tracée dans{" "}
          <Link href="/admin/audit" className="underline">
            /admin/audit
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
