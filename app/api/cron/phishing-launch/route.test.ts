// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de /api/cron/phishing-launch : le passage horaire qui lance les
// campagnes dues et termine celles dont le lancement n'est pas allé au bout.
//
// POURQUOI CETTE ROUTE MÉRITE DES TESTS
//
//   Elle ramasse toute campagne active sans date d'envoi. Or une campagne
//   lancée depuis l'interface reste dans cet état tant que sa boucle d'envoi
//   tourne, et pour de bon si le processus est coupé au milieu (livraison,
//   redémarrage de l'hôte, plantage). La route la traitait alors comme une
//   campagne neuve : elle l'élargissait à tout le tenant, puis écrivait à
//   tout le monde, y compris aux personnes déjà servies. Rien ne le
//   signalait, la campagne finissait « envoyée ».
//
//   Ces tests rejouent donc le passage sur l'état laissé par le précédent,
//   avec une base en mémoire (lib/phishing/base-factice.ts) : ce qui compte
//   est le nombre de messages reçus par chaque personne, pas la liste des
//   appels à Prisma.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", async () => {
  const { base } = await import("@/lib/phishing/base-factice");
  return { db: base.db };
});
vi.mock("@/lib/smtp/sender", async () => {
  const { boite } = await import("@/lib/phishing/base-factice");
  return { sendMailViaTenantSmtp: boite.envoyer };
});
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({
  auditLog: vi.fn(),
  AuditActions: { PHISHING_CAMPAIGN_SENT: "phishing.campaign.sent" },
}));
// recordCronRun est transparent : il exécute le travail et rend son résultat.
vi.mock("@/lib/cron/record", () => ({
  recordCronRun: (_nom: string, travail: () => Promise<unknown>) => travail(),
}));

import * as route from "./route";
import { auditLog } from "@/lib/audit";
import { base, boite } from "@/lib/phishing/base-factice";
import { launchPhishingCampaign } from "@/lib/phishing/launch";

const SECRET = "secret-de-test-assez-long-0123";
const URL_ROUTE = "http://app:3000/api/cron/phishing-launch";
const DEBUT = new Date("2026-11-05T10:00:00.000Z");
const MINUTE = 60_000;
const HEURE = 60 * MINUTE;

const adresse = (id: string) => `${id}@exemple.test`;
const ilYA = (ms: number) => new Date(Date.now() - ms);

function plusTard(ms: number) {
  vi.setSystemTime(new Date(Date.now() + ms));
}

async function passage(headers: Record<string, string> = {}) {
  const reponse = await route.POST(
    new NextRequest(URL_ROUTE, {
      method: "POST",
      headers: { "x-cron-secret": SECRET, ...headers },
    }),
  );
  return {
    status: reponse.status,
    corps: (await reponse.json()) as Record<string, unknown>,
  };
}

/** Le passage suivant, une heure après, dans un processus redémarré. */
async function passageSuivant() {
  base.retablir();
  plusTard(HEURE);
  return passage();
}

function tenantAvec(...ids: string[]) {
  base.ajouterTenant({ id: "t1", slug: "acme", name: "Acme" });
  for (const id of ids) base.ajouterUtilisateur({ id, tenantId: "t1" });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(DEBUT);
  vi.clearAllMocks();
  base.reinitialiser();
  boite.reinitialiser();
  process.env.CRON_SECRET = SECRET;
  process.env.NEXT_PUBLIC_APP_URL = "https://app.exemple.test/";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("campagne programmée, jamais lancée", () => {
  it("écrit une fois à chaque apprenant et manager actif du tenant, à personne d'autre", async () => {
    base.ajouterTenant({ id: "t1", slug: "acme", name: "Acme" });
    base.ajouterTenant({ id: "t2", slug: "autre", name: "Autre" });
    base.ajouterUtilisateur({ id: "u1", tenantId: "t1" });
    base.ajouterUtilisateur({ id: "u2", tenantId: "t1", role: "MANAGER" });
    base.ajouterUtilisateur({ id: "admin", tenantId: "t1", role: "ADMIN" });
    base.ajouterUtilisateur({ id: "parti", tenantId: "t1", isActive: false });
    base.ajouterUtilisateur({ id: "voisin", tenantId: "t2" });
    const c = base.ajouterCampagne({
      tenantId: "t1",
      scheduledAt: ilYA(HEURE),
    });

    const { corps } = await passage();

    expect(boite.recus()).toEqual({ [adresse("u1")]: 1, [adresse("u2")]: 1 });
    expect(base.campagne(c.id).sentAt).toEqual(DEBUT);
    expect(base.resultats(c.id)).toHaveLength(2);
    expect(base.resultats(c.id).every((r) => r.mailDispatchedAt !== null)).toBe(
      true,
    );
    expect(corps).toMatchObject({
      ok: true,
      campaignsLaunched: 1,
      campaignsResumed: 0,
      emailsSent: 2,
      emailsFailed: 0,
    });
  });

  it("n'y touche pas avant sa date", async () => {
    tenantAvec("u1");
    const c = base.ajouterCampagne({
      tenantId: "t1",
      scheduledAt: new Date(Date.now() + HEURE),
    });

    await passage();

    expect(boite.envois).toHaveLength(0);
    expect(base.campagne(c.id).sentAt).toBeNull();
  });

  it("coupée pendant l'envoi, elle reprend au passage suivant sans doublon ni oubli", async () => {
    tenantAvec("u1", "u2", "u3", "u4");
    const c = base.ajouterCampagne({
      tenantId: "t1",
      scheduledAt: ilYA(HEURE),
    });
    boite.couperPendantEnvoi(3);

    await passage();
    // Deux messages partis, le processus est mort sur le troisième.
    expect(boite.envois).toHaveLength(2);
    expect(base.campagne(c.id).sentAt).toBeNull();

    const { corps } = await passageSuivant();

    expect(boite.recus()).toEqual({
      [adresse("u1")]: 1,
      [adresse("u2")]: 1,
      [adresse("u3")]: 1,
      [adresse("u4")]: 1,
    });
    expect(base.campagne(c.id).sentAt).not.toBeNull();
    expect(corps).toMatchObject({ campaignsResumed: 1, emailsSent: 2 });
  });

  it("coupée entre l'envoi et sa trace, seule la personne en cours reçoit deux fois", async () => {
    // Le pire cas, et il est borné : le serveur SMTP a accepté le message,
    // le processus meurt avant de l'avoir noté. On préfère ce doublon unique
    // à l'inverse (noter d'abord, et perdre le message si l'envoi échoue).
    tenantAvec("u1", "u2", "u3", "u4");
    base.ajouterCampagne({ tenantId: "t1", scheduledAt: ilYA(HEURE) });
    boite.couperApresEnvoi(2);

    await passage();
    await passageSuivant();

    expect(boite.recus()).toEqual({
      [adresse("u1")]: 1,
      [adresse("u2")]: 2,
      [adresse("u3")]: 1,
      [adresse("u4")]: 1,
    });
  });

  it("deux passages simultanés n'écrivent pas deux fois à la même personne", async () => {
    tenantAvec("u1", "u2", "u3", "u4");
    const c = base.ajouterCampagne({
      tenantId: "t1",
      scheduledAt: ilYA(HEURE),
    });

    await Promise.all([passage(), passage()]);

    expect(boite.recus()).toEqual({
      [adresse("u1")]: 1,
      [adresse("u2")]: 1,
      [adresse("u3")]: 1,
      [adresse("u4")]: 1,
    });
    expect(base.resultats(c.id)).toHaveLength(4);
  });

  it("rappelé par son lanceur pendant qu'il tourne encore, il ne double personne", async () => {
    // scripts/cron-runner.sh appelle la route avec curl --retry : au-delà
    // du délai d'attente, un second appel arrive alors que le premier
    // envoie toujours.
    tenantAvec("u1", "u2", "u3");
    base.ajouterCampagne({ tenantId: "t1", scheduledAt: ilYA(HEURE) });
    let rappel: Awaited<ReturnType<typeof passage>> | undefined;
    boite.avantChaqueEnvoi(async () => {
      if (!rappel) {
        rappel = { status: 0, corps: {} };
        rappel = await passage();
      }
    });

    const { corps } = await passage();

    expect(rappel?.corps).toMatchObject({
      campaignsInProgress: 1,
      emailsSent: 0,
    });
    expect(corps).toMatchObject({ campaignsLaunched: 1, emailsSent: 3 });
    expect(boite.recus()).toEqual({
      [adresse("u1")]: 1,
      [adresse("u2")]: 1,
      [adresse("u3")]: 1,
    });
  });

  it("un envoi refusé ne bloque pas les autres, et n'est pas rejoué d'heure en heure", async () => {
    tenantAvec("u1", "u2", "u3");
    const c = base.ajouterCampagne({
      tenantId: "t1",
      scheduledAt: ilYA(HEURE),
    });
    boite.echouerPour(adresse("u2"));

    const { corps } = await passage();
    expect(corps).toMatchObject({ emailsSent: 2, emailsFailed: 1 });
    expect(base.campagne(c.id).sentAt).not.toBeNull();
    expect(base.resultatDe(c.id, "u2").mailDispatchedAt).toBeNull();

    boite.reussirPour(adresse("u2"));
    await passageSuivant();

    expect(boite.recus()).toEqual({ [adresse("u1")]: 1, [adresse("u3")]: 1 });
  });

  it("sans SMTP configuré, la campagne attend sans créer de résultat", async () => {
    base.ajouterTenant({ id: "t1", slug: "acme", name: "Acme" }, false);
    base.ajouterUtilisateur({ id: "u1", tenantId: "t1" });
    const c = base.ajouterCampagne({
      tenantId: "t1",
      scheduledAt: ilYA(HEURE),
    });

    const { corps } = await passage();

    expect(corps).toMatchObject({ campaignsSkippedNoSmtp: 1, emailsSent: 0 });
    expect(base.campagne(c.id).sentAt).toBeNull();
    expect(base.resultats(c.id)).toHaveLength(0);
  });

  it("sans personne à qui écrire, elle est close", async () => {
    base.ajouterTenant({ id: "t1", slug: "acme", name: "Acme" });
    const c = base.ajouterCampagne({
      tenantId: "t1",
      scheduledAt: ilYA(HEURE),
    });

    await passage();

    expect(base.campagne(c.id).sentAt).not.toBeNull();
    expect(boite.envois).toHaveLength(0);
  });

  it("hors canal mail, elle crée ses résultats et n'envoie rien", async () => {
    tenantAvec("u1", "u2");
    const c = base.ajouterCampagne({
      tenantId: "t1",
      channel: "SMS",
      scheduledAt: ilYA(HEURE),
    });

    await passage();

    expect(base.resultats(c.id)).toHaveLength(2);
    expect(base.campagne(c.id).sentAt).not.toBeNull();
    expect(boite.envois).toHaveLength(0);
  });
});

describe("lancement commencé ailleurs et resté en plan", () => {
  // L'état que laisse lib/phishing/launch.ts quand sa boucle est coupée :
  // une campagne sans date d'envoi, ses résultats déjà créés pour la cohorte
  // choisie, certains déjà servis.
  function lancementCoupe() {
    tenantAvec("u1", "u2", "u3", "u4", "u5");
    const c = base.ajouterCampagne({
      tenantId: "t1",
      scheduledAt: ilYA(2 * HEURE),
    });
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u1",
      mailAttemptedAt: ilYA(2 * HEURE),
      mailDispatchedAt: ilYA(2 * HEURE),
    });
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u2",
      mailAttemptedAt: ilYA(2 * HEURE),
    });
    base.ajouterResultat({ campaignId: c.id, userId: "u3" });
    return c;
  }

  it("n'écrit qu'aux personnes pas encore servies", async () => {
    const c = lancementCoupe();

    const { corps } = await passage();

    expect(boite.recus()).toEqual({ [adresse("u2")]: 1, [adresse("u3")]: 1 });
    expect(base.campagne(c.id).sentAt).toEqual(DEBUT);
    expect(corps).toMatchObject({
      campaignsLaunched: 0,
      campaignsResumed: 1,
      resultsCreated: 0,
      emailsSent: 2,
    });
  });

  it("n'élargit pas la campagne au reste du tenant", async () => {
    const c = lancementCoupe();

    await passage();

    // u4 et u5 n'étaient pas dans la cohorte choisie au lancement.
    expect(base.resultats(c.id).map((r) => r.userId)).toEqual([
      "u1",
      "u2",
      "u3",
    ]);
    expect(boite.recus()[adresse("u4")]).toBeUndefined();
    expect(boite.recus()[adresse("u5")]).toBeUndefined();
  });

  it("laisse au cron drip les envois étalés, échus ou non", async () => {
    const c = lancementCoupe();
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u4",
      dripScheduledAt: new Date(Date.now() + 24 * HEURE),
    });
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u5",
      dripScheduledAt: ilYA(HEURE),
    });

    await passage();

    expect(boite.recus()).toEqual({ [adresse("u2")]: 1, [adresse("u3")]: 1 });
    expect(base.resultatDe(c.id, "u4").mailDispatchedAt).toBeNull();
    expect(base.resultatDe(c.id, "u5").mailDispatchedAt).toBeNull();
  });

  it("ne touche pas à un lancement encore en cours", async () => {
    tenantAvec("u1", "u2", "u3");
    const c = base.ajouterCampagne({
      tenantId: "t1",
      scheduledAt: ilYA(3 * MINUTE),
    });
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u1",
      mailAttemptedAt: ilYA(2 * MINUTE),
      mailDispatchedAt: ilYA(2 * MINUTE),
    });
    // La boucle du lancement est sur u2 en ce moment même.
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u2",
      mailAttemptedAt: ilYA(1000),
    });
    base.ajouterResultat({ campaignId: c.id, userId: "u3" });

    const { corps } = await passage();

    expect(boite.envois).toHaveLength(0);
    expect(base.campagne(c.id).sentAt).toBeNull();
    expect(corps).toMatchObject({
      campaignsInProgress: 1,
      campaignsResumed: 0,
    });
  });

  it("le reprend une fois le lancement silencieux depuis assez longtemps", async () => {
    tenantAvec("u1", "u2");
    const c = base.ajouterCampagne({
      tenantId: "t1",
      scheduledAt: ilYA(3 * MINUTE),
    });
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u1",
      mailAttemptedAt: ilYA(2 * MINUTE),
    });
    base.ajouterResultat({ campaignId: c.id, userId: "u2" });

    await passage();
    expect(boite.envois).toHaveLength(0);

    await passageSuivant();

    expect(boite.recus()).toEqual({ [adresse("u1")]: 1, [adresse("u2")]: 1 });
    expect(base.campagne(c.id).sentAt).not.toBeNull();
  });

  it("envoie le même message que le lancement : modèle du tenant, variante, pixel", async () => {
    tenantAvec("u1", "u2");
    base.ajouterModele({
      tenantId: "t1",
      slug: "FAKE_MICROSOFT",
      name: "Microsoft maison",
      emailSubject: "Sujet du tenant",
      emailHtml: "<p>Bonjour {firstName}, <a href='{trackingUrl}'>ici</a></p>",
      isActive: true,
    });
    base.ajouterModele({
      tenantId: null,
      slug: "variante-b",
      name: "Variante B",
      emailSubject: "Sujet de la variante B",
      emailHtml: "<p>{firstName} : {trackingUrl}</p>",
      isActive: true,
    });
    const c = base.ajouterCampagne({
      tenantId: "t1",
      variantBSlug: "variante-b",
      scheduledAt: ilYA(2 * HEURE),
    });
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u1",
      trackToken: "jetonA",
    });
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u2",
      trackToken: "jetonB",
      variant: "B",
    });

    await passage();

    const [a, b] = boite.envois;
    expect(a).toMatchObject({ to: adresse("u1"), subject: "Sujet du tenant" });
    expect(a.html).toContain("Bonjour Prénom-u1");
    expect(a.html).toContain("https://app.exemple.test/phishing/jetonA");
    expect(a.html).toContain(
      "https://app.exemple.test/api/phishing/track/open/jetonA",
    );
    expect(b).toMatchObject({
      to: adresse("u2"),
      subject: "Sujet de la variante B",
    });
    expect(b.html).toContain("https://app.exemple.test/phishing/jetonB");
  });

  it("trace la reprise dans le journal d'audit", async () => {
    const c = lancementCoupe();

    await passage();

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        target: expect.objectContaining({ id: c.id }),
        metadata: expect.objectContaining({ resumed: true, recipientCount: 3 }),
      }),
    );
  });
});

describe("de bout en bout, avec le vrai lancement", () => {
  // Les états ci-dessus sont écrits à la main. Ici c'est le lancement
  // lui-même (lib/phishing/launch.ts) qui produit l'état que la route
  // reprend : le tenant compte six personnes, la campagne en vise quatre.
  const COHORTE = ["u1", "u2", "u3", "u4"];
  const UNE_FOIS_CHACUN = Object.fromEntries(
    COHORTE.map((id) => [adresse(id), 1]),
  );

  function lancer() {
    return launchPhishingCampaign({
      tenantId: "t1",
      templateId: "FAKE_MICROSOFT",
      targets: COHORTE.map((id) => ({
        id,
        email: adresse(id),
        name: `Prénom-${id} Nom`,
      })),
      targetingMode: "groups",
    });
  }

  beforeEach(() => {
    tenantAvec("u1", "u2", "u3", "u4", "u5", "u6");
  });

  it("un lancement coupé au milieu est terminé au passage suivant, pour sa cohorte seulement", async () => {
    boite.couperPendantEnvoi(3);
    await expect(lancer()).rejects.toThrow("processus coupé");
    expect(boite.envois).toHaveLength(2);

    const { corps } = await passageSuivant();

    expect(boite.recus()).toEqual(UNE_FOIS_CHACUN);
    expect(corps).toMatchObject({
      campaignsResumed: 1,
      resultsCreated: 0,
      emailsSent: 2,
    });
    expect(base.campagnes()[0].sentAt).not.toBeNull();
  });

  it("un lancement coupé juste après sa création part au passage suivant, pour sa cohorte seulement", async () => {
    base.couperApresEcriture(1);
    await expect(lancer()).rejects.toThrow("processus coupé");
    expect(boite.envois).toHaveLength(0);

    await passageSuivant();

    expect(boite.recus()).toEqual(UNE_FOIS_CHACUN);
  });

  it("le passage qui tombe pendant un lancement ne double personne", async () => {
    let pendant: Awaited<ReturnType<typeof passage>> | undefined;
    boite.avantChaqueEnvoi(async () => {
      if (!pendant) {
        pendant = { status: 0, corps: {} };
        pendant = await passage();
      }
    });

    const issue = await lancer();

    expect(pendant?.corps).toMatchObject({
      campaignsInProgress: 1,
      emailsSent: 0,
    });
    expect(issue).toMatchObject({ ok: true, sent: 4, failed: 0 });
    expect(boite.recus()).toEqual(UNE_FOIS_CHACUN);
  });

  it("un lancement dont aucun envoi n'a abouti est retenté une fois, à l'heure suivante", async () => {
    for (const id of COHORTE) boite.echouerPour(adresse(id));
    expect(await lancer()).toMatchObject({ ok: true, sent: 0, failed: 4 });
    for (const id of COHORTE) boite.reussirPour(adresse(id));

    const { corps } = await passageSuivant();

    expect(corps).toMatchObject({ campaignsResumed: 1, emailsSent: 4 });
    expect(boite.recus()).toEqual(UNE_FOIS_CHACUN);

    await passageSuivant();
    expect(boite.recus()).toEqual(UNE_FOIS_CHACUN);
  });
});

describe("accès", () => {
  it("refuse sans secret ni session", async () => {
    tenantAvec("u1");
    base.ajouterCampagne({ tenantId: "t1", scheduledAt: ilYA(HEURE) });

    const { status } = await passage({ "x-cron-secret": "mauvais-secret" });

    expect(status).toBe(401);
    expect(boite.envois).toHaveLength(0);
  });
});
