// PDF du rapport d'audit de sécurité.
// Source de vérité : SECURITY_AUDIT.md à la racine. On ne rejoue pas le
// markdown intégral (pertes de fidélité @react-pdf vs MD), on construit
// directement la version structurée avec le contenu pédagogique.
//
// Helvetica only (cf. note dans pdf-audit-flash.tsx) — pas d'emojis Unicode.

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const COLORS = {
  primary: "#0B3D91",
  accent: "#00A3A1",
  success: "#2E8B57",
  warn: "#F59E0B",
  danger: "#C0392B",
  gray: "#555555",
  light: "#EAF3F8",
  cream: "#FFF8E5",
};

const styles = StyleSheet.create({
  page: { padding: 50, fontSize: 10, fontFamily: "Helvetica", color: "#1A1A1A" },
  pageHeader: {
    borderBottom: "1pt solid #0B3D91",
    paddingBottom: 8,
    marginBottom: 16,
  },
  brand: { fontSize: 12, color: COLORS.primary, fontWeight: "bold" },
  brandSub: { fontSize: 8, color: COLORS.gray, marginTop: 2 },

  // Cover
  coverTitle: {
    fontSize: 32,
    color: COLORS.primary,
    fontWeight: "bold",
    marginTop: 80,
    marginBottom: 8,
    textAlign: "center",
  },
  coverSubtitle: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  coverBlock: {
    backgroundColor: COLORS.light,
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 40,
    marginBottom: 14,
  },
  coverLabel: {
    fontSize: 8,
    color: COLORS.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  coverValue: { fontSize: 12, color: COLORS.primary, fontWeight: "bold", marginTop: 2 },

  // Headings
  h1: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: "bold",
    marginTop: 6,
    marginBottom: 10,
  },
  h2: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
  },
  h3: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 4,
  },

  paragraph: { fontSize: 10, lineHeight: 1.45, marginBottom: 6 },

  bulletRow: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 12, fontSize: 10, lineHeight: 1.45 },
  bulletText: { flex: 1, fontSize: 10, lineHeight: 1.45 },

  // Tables
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #DDDDDD",
    paddingVertical: 4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.light,
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontWeight: "bold",
  },
  tableCell: { fontSize: 9, paddingHorizontal: 4 },
  tableCellHeader: { fontSize: 9, fontWeight: "bold", color: COLORS.primary, paddingHorizontal: 4 },

  // Boxes
  badgeSuccess: {
    fontSize: 8,
    color: COLORS.success,
    fontWeight: "bold",
    backgroundColor: "#E8F5E9",
    padding: 3,
    borderRadius: 3,
  },
  badgeWarn: {
    fontSize: 8,
    color: "#7C5E10",
    fontWeight: "bold",
    backgroundColor: COLORS.cream,
    padding: 3,
    borderRadius: 3,
  },
  badgeDanger: {
    fontSize: 8,
    color: COLORS.danger,
    fontWeight: "bold",
    backgroundColor: "#FCEDEB",
    padding: 3,
    borderRadius: 3,
  },

  callout: {
    backgroundColor: COLORS.cream,
    borderLeft: "3pt solid " + COLORS.warn,
    padding: 10,
    marginVertical: 8,
    borderRadius: 4,
  },
  calloutTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#7C5E10",
    marginBottom: 3,
  },
  calloutText: { fontSize: 9, color: "#7C5E10", lineHeight: 1.4 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 25,
    left: 50,
    right: 50,
    fontSize: 8,
    color: COLORS.gray,
    borderTop: "0.5pt solid #DDDDDD",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function PageHeader() {
  return (
    <View style={styles.pageHeader} fixed>
      <Text style={styles.brand}>Humanix Académie · Rapport d'audit de sécurité</Text>
      <Text style={styles.brandSub}>v1.0 — 2 mai 2026 · public · humanix-cybersecurity.fr</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text>Humanix-Cybersecurity · security@humanix-cybersecurity.fr</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow} wrap={false}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function MaturityRow({
  label,
  level,
}: {
  label: string;
  level: "mature" | "intermediate" | "todo";
}) {
  const badge =
    level === "mature" ? styles.badgeSuccess : level === "intermediate" ? styles.badgeWarn : styles.badgeDanger;
  const text = level === "mature" ? "MATURE" : level === "intermediate" ? "INTERMEDIAIRE" : "A FAIRE";
  return (
    <View style={styles.tableRow} wrap={false}>
      <Text style={[styles.tableCell, { flex: 4 }]}>{label}</Text>
      <View style={{ flex: 1, alignItems: "flex-end" }}>
        <Text style={badge}>{text}</Text>
      </View>
    </View>
  );
}

export function SecurityAuditReport() {
  const date = new Date().toLocaleDateString("fr-FR", { dateStyle: "long" } as any);

  return (
    <Document>
      {/* === PAGE 1 : COUVERTURE === */}
      <Page size="A4" style={styles.page}>
        <PageHeader />

        <Text style={styles.coverTitle}>Rapport d'audit{"\n"}de sécurité</Text>
        <Text style={styles.coverSubtitle}>Public · Daté · Signé</Text>

        <View style={styles.coverBlock}>
          <Text style={styles.coverLabel}>Édition</Text>
          <Text style={styles.coverValue}>v1.0 — 2 mai 2026</Text>
        </View>

        <View style={styles.coverBlock}>
          <Text style={styles.coverLabel}>Périmètre</Text>
          <Text style={styles.coverValue}>
            Plateforme SaaS Humanix Académie (production + infrastructure + processus)
          </Text>
        </View>

        <View style={styles.coverBlock}>
          <Text style={styles.coverLabel}>Émetteur</Text>
          <Text style={styles.coverValue}>
            Humanix-Cybersecurity
          </Text>
        </View>

        <View style={styles.coverBlock}>
          <Text style={styles.coverLabel}>Contact sécurité</Text>
          <Text style={styles.coverValue}>security@humanix-cybersecurity.fr</Text>
        </View>

        <View style={[styles.callout, { marginHorizontal: 40, marginTop: 20 }]}>
          <Text style={styles.calloutTitle}>Pourquoi ce rapport est public</Text>
          <Text style={styles.calloutText}>
            Humanix-Cybersecurity vend de la sensibilisation à la cybersécurité. Il
            serait incohérent de prêcher la vigilance sans nous y soumettre nous-mêmes
            — et plus encore sans rendre nos pratiques inspectables.{"\n\n"}
            Ce rapport documente honnêtement ce que nous faisons bien, ce que nous
            n'avons pas encore fait et pourquoi, et notre plan de remédiation à 6 mois.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* === PAGE 2 : SYNTHESE EXECUTIVE === */}
      <Page size="A4" style={styles.page}>
        <PageHeader />
        <Text style={styles.h1}>1. Synthèse exécutive</Text>

        <Text style={styles.h2}>Niveau de maturité global</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableCellHeader, { flex: 4 }]}>Domaine</Text>
          <Text style={[styles.tableCellHeader, { flex: 1, textAlign: "right" }]}>Niveau</Text>
        </View>
        <MaturityRow label="Authentification & autorisation" level="mature" />
        <MaturityRow label="Sécurité applicative" level="mature" />
        <MaturityRow label="Sécurité réseau & infrastructure" level="mature" />
        <MaturityRow label="Protection des données (RGPD)" level="mature" />
        <MaturityRow label="SDLC sécurisé" level="intermediate" />
        <MaturityRow label="Gestion des incidents" level="intermediate" />
        <MaturityRow label="Audit externe formel" level="todo" />

        <Text style={[styles.h2, { marginTop: 16 }]}>Synthèse en 3 chiffres</Text>
        <Bullet>0 vulnérabilité critique connue à la date de rédaction</Bullet>
        <Bullet>
          6 programmes en backlog (pentest externe, audit RGAA, scan dépendances, bug bounty, dashboard SOC, drill annuel)
        </Bullet>
        <Bullet>
          100 % des données sensibles traitées sur des hébergements français ou européens identifiables (zéro Cloud Act US)
        </Bullet>

        <Text style={styles.h2}>Position éditoriale assumée</Text>
        <Bullet>
          Nous NE PRETENDONS PAS être ISO 27001 ni SOC 2. Disproportionnés pour notre segment (TPE/PME, budget cyber {"<"} 5 K€/an).
        </Bullet>
        <Bullet>
          Nous NE PRETENDONS PAS être SecNumCloud. Cette qualification s'adresse à des opérateurs critiques.
        </Bullet>
        <Bullet>
          Nous REVENDIQUONS un niveau "ANSSI-PME ready" : robuste, transparent, en amélioration continue.
        </Bullet>

        <PageFooter />
      </Page>

      {/* === PAGE 3 : METHODOLOGIE === */}
      <Page size="A4" style={styles.page}>
        <PageHeader />
        <Text style={styles.h1}>2. Périmètre et méthodologie</Text>

        <Text style={styles.h2}>2.1 Périmètre couvert</Text>
        <Bullet>Plateforme web Humanix Académie (production)</Bullet>
        <Bullet>API REST publique (/api/v1/*)</Bullet>
        <Bullet>Service TTS auto-hébergé (Piper)</Bullet>
        <Bullet>Reverse proxy HAProxy frontend</Bullet>
        <Bullet>Base de données PostgreSQL</Bullet>
        <Bullet>Endpoints cron (observatoire fuites, anecdotes)</Bullet>

        <Text style={styles.h2}>2.2 Référentiels d'évaluation</Text>
        <Bullet>OWASP ASVS 4.0 (Application Security Verification Standard)</Bullet>
        <Bullet>Guide ANSSI "Sécurité numérique des PME"</Bullet>
        <Bullet>CNIL — Référentiel de conformité RGPD</Bullet>
        <Bullet>CIS Controls v8 (infrastructure et SDLC)</Bullet>

        <Text style={styles.h2}>2.3 Tests effectués</Text>
        <Bullet>Revue de code interne (continue) — routes API, server actions, helpers d'auth</Bullet>
        <Bullet>Test SSRF webhooks : URLs internes (10.x, 127.x, 192.168.x, .local) refusées — VALIDE</Bullet>
        <Bullet>Test injection HTML/XSS sur générateur phishing IA — VALIDE</Bullet>
        <Bullet>Test rate limiting sur endpoints sensibles — VALIDE</Bullet>
        <Bullet>Test isolation tenant (manipulation paramètres) — REFUS CORRECT</Bullet>
        <Bullet>Test échappement Prisma (backslashes, surrogates, NULL bytes) — VALIDE</Bullet>
        <Bullet>Audit accessibilité interne WCAG 2.1 AA / RGAA 4.1 — score 88 %</Bullet>

        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>Tests NON encore réalisés (transparence)</Text>
          <Text style={styles.calloutText}>
            • Pentest externe par cabinet PASSI (programmé à venir){"\n"}
            • Audit RGAA externe (programmé à venir, ~3 000 € HT){"\n"}
            • Test de charge {">"} 200 utilisateurs simultanés{"\n"}
            • Audit cryptographique des secrets de session
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* === PAGE 4 : ARCHITECTURE === */}
      <Page size="A4" style={styles.page}>
        <PageHeader />
        <Text style={styles.h1}>3. Architecture et flux de données</Text>

        <Text style={styles.h2}>3.1 Topologie</Text>
        <Text style={styles.paragraph}>
          La plateforme est conteneurisée (Docker Compose) avec une segmentation
          réseau stricte :
        </Text>
        <Bullet>
          Réseau frontend (humanix_frontend) : haproxy {"↔"} app — seul HAProxy y est
          exposé sur l'host
        </Bullet>
        <Bullet>
          Réseau backend (humanix_backend) : app {"↔"} postgres et app {"↔"} tts —
          aucun service exposé sur l'host
        </Bullet>
        <Bullet>
          Postgres et TTS sont strictement internes : aucun mapping de port host
        </Bullet>

        <Text style={styles.h2}>3.2 Flux de données sensibles</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableCellHeader, { flex: 2 }]}>Donnée</Text>
          <Text style={[styles.tableCellHeader, { flex: 2 }]}>Stockage</Text>
          <Text style={[styles.tableCellHeader, { flex: 2 }]}>Sortie réseau</Text>
        </View>
        {[
          ["Identifiants utilisateurs", "PostgreSQL (Auth.js)", "Aucune"],
          ["Mots de passe", "AUCUN (zero-password)", "Aucune"],
          ["Tokens OAuth", "PostgreSQL chiffré", "Aucune"],
          ["Progression apprenant", "PostgreSQL", "Aucune"],
          ["Contenu newsletter", "PostgreSQL", "Resend (envoi mail)"],
          ["Prompts Mistral", "RAM uniquement", "Mistral AI (Paris, FR)"],
          ["Audio TTS", "Cache disque sha256", "Aucune (interne)"],
          ["Logs système", "stdout (Docker)", "Aucune par défaut"],
        ].map(([d, s, n], i) => (
          <View key={i} style={styles.tableRow} wrap={false}>
            <Text style={[styles.tableCell, { flex: 2 }]}>{d}</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>{s}</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>{n}</Text>
          </View>
        ))}

        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>Souveraineté assumée</Text>
          <Text style={styles.calloutText}>
            Aucune donnée utilisateur n'est envoyée à un service tiers Cloud Act US
            sans configuration explicite par le tenant. L'IA générative est Mistral
            (français), pas OpenAI / Anthropic / Google.
          </Text>
        </View>

        <PageFooter />
      </Page>

      {/* === PAGE 5 : SECURITE APPLICATIVE === */}
      <Page size="A4" style={styles.page}>
        <PageHeader />
        <Text style={styles.h1}>4. Sécurité applicative</Text>

        <Text style={styles.h2}>4.1 Authentification</Text>
        <Bullet>
          Zero-password par défaut : aucun mot de passe stocké côté HumaniX
        </Bullet>
        <Bullet>3 modes : magic link Resend, SSO Google OAuth 2.0, SSO Microsoft Entra OIDC</Bullet>
        <Bullet>Auth.js v5 + Prisma Adapter, sessions JWT signées en mode database</Bullet>
        <Bullet>
          Vérification isActive dans 4 callbacks (authorize, signIn, jwt, session) — un
          compte suspendu n'a aucune voie d'accès valide
        </Bullet>
        <Bullet>Magic link à usage unique avec TTL 1h</Bullet>
        <Bullet>SSO refuse comptes inexistants en BDD (pas d'auto-création)</Bullet>

        <Text style={styles.h2}>4.2 Autorisation (multi-tenant)</Text>
        <Bullet>
          Tous les modèles sensibles ont un tenantId String obligatoire et indexé
        </Bullet>
        <Bullet>Filtrage strict tenantId dans toutes les queries Prisma</Bullet>
        <Bullet>Rôles : LEARNER {"<"} MANAGER {"<"} ADMIN {"<"} SUPERADMIN</Bullet>
        <Bullet>
          Plan-gating à 6 paliers (trial / decouverte / solo / essentielle / pro /
          premium) sur les features payantes
        </Bullet>
        <Bullet>Helper requireAdminTenant() réutilisé sur toutes les server actions</Bullet>

        <Text style={styles.h2}>4.3 Protection contre les attaques courantes</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableCellHeader, { flex: 2 }]}>Attaque</Text>
          <Text style={[styles.tableCellHeader, { flex: 4 }]}>Protection</Text>
        </View>
        {[
          ["SQL Injection", "Prisma ORM (queries paramétrées). Zéro $queryRawUnsafe."],
          ["XSS", "React échappe par défaut. dangerouslySetInnerHTML auditée (2 cas)."],
          ["CSRF", "Server Actions Next.js avec protection CSRF native."],
          ["SSRF", "isSafeWebhookUrl() refuse non-HTTPS, IPs privées, .local/.internal."],
          ["Open redirect", "Aucune redirection sur paramètre utilisateur non-whitelisté."],
          ["Clickjacking", "X-Frame-Options: DENY (HAProxy)."],
          ["MIME sniffing", "X-Content-Type-Options: nosniff."],
          ["Information disclosure", "Server / X-Powered-By supprimés. Errorfiles brandés."],
          ["Brute force connexion", "Magic link single-use + rate limit HAProxy."],
        ].map(([a, p], i) => (
          <View key={i} style={styles.tableRow} wrap={false}>
            <Text style={[styles.tableCell, { flex: 2 }]}>{a}</Text>
            <Text style={[styles.tableCell, { flex: 4 }]}>{p}</Text>
          </View>
        ))}

        <PageFooter />
      </Page>

      {/* === PAGE 6 : SECURITE INFRA === */}
      <Page size="A4" style={styles.page}>
        <PageHeader />
        <Text style={styles.h1}>5. Sécurité infrastructure</Text>

        <Text style={styles.h2}>5.1 HAProxy frontend</Text>
        <Bullet>Version 2.9-alpine, seul exposé sur 80/443</Bullet>
        <Bullet>TLS 1.2 minimum, ciphers Mozilla Intermediate (AEAD only)</Bullet>
        <Bullet>HTTP/2 ALPN, healthcheck /api/health toutes les 5s</Bullet>
        <Bullet>Stick-table IPv6 100K, expire 30 min</Bullet>
        <Bullet>Rate limit : 100 req/10s, 30 errors/10s, 50 conn/10s par IP</Bullet>

        <Text style={styles.h2}>5.2 Règles HAProxy de sécurité</Text>
        <Bullet>ACL méthodes HTTP autorisées : GET POST PUT PATCH DELETE OPTIONS HEAD</Bullet>
        <Bullet>
          Blocage UA bots offensifs : sqlmap, nikto, nmap, masscan, wpscan, gobuster,
          dirbuster, hydra, hakrawler
        </Bullet>
        <Bullet>UA vide refusé (deny 403)</Bullet>
        <Bullet>Headers anti-fingerprint : Server / X-Powered-By supprimés</Bullet>
        <Bullet>
          Security headers : HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff,
          Referrer-Policy strict-origin, Permissions-Policy
        </Bullet>

        <Text style={styles.h2}>5.3 Conteneurisation</Text>
        <Bullet>Multi-stage Dockerfile, image finale ~150 Mo</Bullet>
        <Bullet>Tous les conteneurs en utilisateur non-root</Bullet>
        <Bullet>AUTH_SECRET injecté UNIQUEMENT au build, jamais en layer persistant</Bullet>
        <Bullet>DATABASE_URL placeholder au build, vraie URL au runtime</Bullet>
        <Bullet>
          Service TTS limité à 512 Mo de RAM (déni de service local impossible)
        </Bullet>

        <Text style={styles.h2}>5.4 Gestion des secrets</Text>
        <Bullet>Aucun secret committé dans Git</Bullet>
        <Bullet>AUTH_SECRET : openssl rand -base64 32 (rotation tous les 6 mois)</Bullet>
        <Bullet>CRON_SECRET : openssl rand -hex 32, comparaison timingSafeEqual</Bullet>
        <Bullet>OAuth secrets, Resend API key, Mistral API key : env conteneur</Bullet>
        <Bullet>Production : secret manager Scaleway / Vault recommandé</Bullet>

        <PageFooter />
      </Page>

      {/* === PAGE 7 : RGPD === */}
      <Page size="A4" style={styles.page}>
        <PageHeader />
        <Text style={styles.h1}>6. Protection des données personnelles (RGPD)</Text>

        <Text style={styles.h2}>6.1 Catégorisation et durées</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableCellHeader, { flex: 2 }]}>Catégorie</Text>
          <Text style={[styles.tableCellHeader, { flex: 2 }]}>Base légale</Text>
          <Text style={[styles.tableCellHeader, { flex: 2 }]}>Conservation</Text>
        </View>
        {[
          ["Identification compte", "Contrat (art. 6.1.b)", "Contrat + 13 mois"],
          ["Données de progression", "Contrat", "Durée du contrat"],
          ["Risk score & maîtrise", "Intérêt légitime + contrat", "Durée du contrat"],
          ["Logs d'événements", "Intérêt légitime (sécu)", "13 mois (à formaliser)"],
          ["Audit Flash (leads)", "Consentement", "36 mois max"],
          ["Newsletter Cyber-Anecdote", "Consentement explicite", "Jusqu'à désabonnement"],
        ].map(([c, b, d], i) => (
          <View key={i} style={styles.tableRow} wrap={false}>
            <Text style={[styles.tableCell, { flex: 2 }]}>{c}</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>{b}</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>{d}</Text>
          </View>
        ))}

        <Text style={styles.h2}>6.2 Droits implémentés</Text>
        <Bullet>Information (art. 13) — page /confidentialite exhaustive</Bullet>
        <Bullet>Accès (art. 15) — sur demande à rgpd@humanix-cybersecurity.fr, {"<"} 30 jours</Bullet>
        <Bullet>Rectification (art. 16) — auto-service depuis /profil</Bullet>
        <Bullet>Effacement (art. 17) — sur demande, traitement {"<"} 30 jours, cascade Prisma</Bullet>
        <Bullet>Limitation (art. 18) — compte mis en isActive: false</Bullet>
        <Bullet>Portabilité (art. 20) — export CSV partiel (zip complet en backlog)</Bullet>
        <Bullet>Opposition (art. 21) — désinscription newsletter en 1 clic</Bullet>

        <Text style={styles.h2}>6.3 Privacy by design</Text>
        <Bullet>Minimisation : pas d'âge, genre, date de naissance, adresse postale, photo</Bullet>
        <Bullet>IP hashées SHA-256 dans audits (anti-fingerprint utilisateur)</Bullet>
        <Bullet>Newsletter : opt-in actif, hash du texte de consentement stocké comme preuve</Bullet>
        <Bullet>Audit logs : payloads sans contenu sensible (longueurs, types, hashes)</Bullet>

        <Text style={styles.h2}>6.4 Sous-traitants RGPD (art. 28)</Text>
        <Bullet>Scaleway (FR) — hébergement — DPA signé</Bullet>
        <Bullet>Resend (UE Berlin/Dublin) — envoi mails — DPA signé</Bullet>
        <Bullet>Mistral AI (FR Paris) — IA générative — DPA signé</Bullet>
        <Bullet>Google / Microsoft — SSO uniquement, AUCUNE donnée HumaniX transmise</Bullet>

        <PageFooter />
      </Page>

      {/* === PAGE 8 : SDLC + INCIDENTS === */}
      <Page size="A4" style={styles.page}>
        <PageHeader />
        <Text style={styles.h1}>7. SDLC et gestion des incidents</Text>

        <Text style={styles.h2}>7.1 Stack technique</Text>
        <Bullet>TypeScript strict — détection erreurs au build</Bullet>
        <Bullet>Next.js 15 App Router — Server Components, CSRF natif</Bullet>
        <Bullet>Prisma ORM — queries paramétrées (immune SQL injection)</Bullet>
        <Bullet>Auth.js v5 — lib auditée, base installée massive</Bullet>
        <Bullet>Zod — validation runtime systématique</Bullet>

        <Text style={styles.h2}>7.2 Tests et CI</Text>
        <Bullet>tsc --noEmit + next lint au build (refus si erreurs)</Bullet>
        <Bullet>Tests unitaires partiels (helpers risk-score, plans)</Bullet>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>Constat honnête</Text>
          <Text style={styles.calloutText}>
            Pas encore de tests E2E Playwright ni de scan SAST automatisé en CI. C'est
            notre principal point d'amélioration SDLC. Planifié à venir (cf. plan
            de remédiation).
          </Text>
        </View>

        <Text style={styles.h2}>7.3 Plan de réponse aux incidents</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableCellHeader, { flex: 4 }]}>Étape</Text>
          <Text style={[styles.tableCellHeader, { flex: 1, textAlign: "right" }]}>Délai cible</Text>
        </View>
        {[
          ["Détection (alerte ou signalement)", "T+0"],
          ["Confinement réseau", "T+15 min"],
          ["Notification équipe interne", "T+30 min"],
          ["Notification client (si fuite tenant)", "T+4h"],
          ["Notification CNIL (si données perso)", "T+72h max"],
          ["Communication publique (blog, /securite)", "T+7j max"],
          ["REX écrit et publié", "T+30j"],
        ].map(([etape, delai], i) => (
          <View key={i} style={styles.tableRow} wrap={false}>
            <Text style={[styles.tableCell, { flex: 4 }]}>{etape}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right", fontWeight: "bold" }]}>{delai}</Text>
          </View>
        ))}

        <Text style={styles.h2}>7.4 Audit trail interne</Text>
        <Bullet>Toutes les actions sensibles loggées dans table Event</Bullet>
        <Bullet>tenantId, userId, type, payload (sans contenu sensible)</Bullet>
        <Bullet>Permet la reconstitution forensique en cas d'incident</Bullet>

        <PageFooter />
      </Page>

      {/* === PAGE 9 : CONSTATS + PLAN REMEDIATION === */}
      <Page size="A4" style={styles.page}>
        <PageHeader />
        <Text style={styles.h1}>9. Constats et plan de remédiation</Text>

        <Text style={styles.h2}>9.1 Points forts à conserver</Text>
        <Bullet>Souveraineté FR/UE assumée — zéro Cloud Act US sur données client</Bullet>
        <Bullet>Architecture multi-tenant solide — scoping strict, plan-gating</Bullet>
        <Bullet>SDLC moderne — TypeScript strict, ORM, validation Zod systématique</Bullet>
        <Bullet>Transparence éditoriale — /comparatif, /securite, ce rapport public</Bullet>
        <Bullet>RGPD natif et non bolt-on — DPA, registre, droits, IP hashées, minimisation</Bullet>

        <Text style={styles.h2}>9.2 Plan de remédiation à venir</Text>
        <Bullet>Mise en place de Dependabot sur le repo principal</Bullet>
        <Bullet>Scan SAST en CI (Semgrep, ruleset OWASP)</Bullet>
        <Bullet>Politique de purge Event à 13 mois (cron mensuel)</Bullet>
        <Bullet>Formalisation programme bug bounty</Bullet>
        <Bullet>Recrutement cabinet pentest externe (devis pris auprès de 3 acteurs FR)</Bullet>

        <Text style={styles.h2}>9.3 Plan de remédiation à venir</Text>
        <Bullet>Pentest externe réalisé (boîte grise, ~5-7 jours)</Bullet>
        <Bullet>Audit RGAA externe par cabinet certifié (Atalan / Tanaguru / Access42)</Bullet>
        <Bullet>Tests E2E Playwright sur 5 flows critiques</Bullet>
        <Bullet>Mise à jour de ce rapport avec findings et résolutions</Bullet>
        <Bullet>Publication d'un journal d'incidents (vide à ce jour)</Bullet>

        <Text style={styles.h2}>9.4 Limites assumées par design</Text>
        <Bullet>
          Pas de SAML 2.0 / SCIM enterprise (focus PME, sur demande {">"} 50 utilisateurs)
        </Bullet>
        <Bullet>
          Pas de chiffrement applicatif au-delà du TLS (TLS + filesystem Scaleway suffit)
        </Bullet>
        <Bullet>
          Pas d'ISO 27001 ni SOC 2 (disproportionné pour le segment PME visé)
        </Bullet>

        <PageFooter />
      </Page>

      {/* === PAGE 10 : DIVULGATION + CONCLUSION === */}
      <Page size="A4" style={styles.page}>
        <PageHeader />
        <Text style={styles.h1}>11. Programme de divulgation responsable</Text>

        <Text style={styles.h2}>Périmètre</Text>
        <Text style={styles.paragraph}>
          Toute découverte de vulnérabilité affectant humanix-cybersecurity.fr et ses
          sous-domaines, ou la plateforme Humanix Académie, est éligible.
        </Text>
        <Text style={styles.paragraph}>
          Hors périmètre : sites tiers (Resend, Stripe, Mistral, etc.), social
          engineering des employés, attaques DoS volumétriques.
        </Text>

        <Text style={styles.h2}>Comment signaler</Text>
        <Text style={styles.paragraph}>
          Email à security@humanix-cybersecurity.fr avec : description du problème,
          étapes de reproduction, impact estimé, suggestion de remédiation (optionnel).
        </Text>

        <Text style={styles.h2}>Engagements de notre côté</Text>
        <Bullet>Accusé de réception sous 48 heures ouvrées</Bullet>
        <Bullet>Évaluation initiale et plan d'action sous 5 jours ouvrés</Bullet>
        <Bullet>Information sur la résolution dans les 30 jours</Bullet>
        <Bullet>Pas de poursuites légales contre les chercheurs respectueux des règles</Bullet>
        <Bullet>Crédit public sur ce rapport et /securite/remerciements (avec accord)</Bullet>

        <Text style={styles.h2}>Règles à respecter</Text>
        <Bullet>Tester uniquement sur des comptes que vous avez créés</Bullet>
        <Bullet>Ne pas accéder aux données d'autres utilisateurs</Bullet>
        <Bullet>Ne pas dégrader le service ni les données</Bullet>
        <Bullet>Ne pas divulguer publiquement avant correction (90 jours max)</Bullet>

        <View style={[styles.callout, { marginTop: 20 }]}>
          <Text style={styles.calloutTitle}>Pour conclure</Text>
          <Text style={styles.calloutText}>
            Ce rapport est honnête par conception. Il liste autant nos forces que nos
            lacunes, parce que la confiance se construit sur la transparence — pas sur
            l'autocélébration.{"\n\n"}
            La cybersécurité n'est pas une destination, c'est une trajectoire. Nous
            vous tenons informés.{"\n\n"}
            — Florian DURANO, fondateur, Humanix-Cybersecurity.
          </Text>
        </View>

        <Text style={[styles.paragraph, { marginTop: 14, textAlign: "center", fontSize: 9, color: COLORS.gray }]}>
          Émis le {date} · v1.0 · public · humanix-cybersecurity.fr
        </Text>

        <PageFooter />
      </Page>
    </Document>
  );
}
