// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de /api/cron/phishing-drip : le passage horaire qui envoie les
// mails d'une campagne étalée, lot par lot, à leur échéance.
//
// Ce cron traite les mails un par un et note chaque envoi : une coupure ne
// lui fait ni doubler ni oublier personne, et c'est lui qui termine le
// premier lot d'un lancement étalé coupé en route. Sa seule faiblesse était
// la concurrence avec ce lancement, dont le premier lot est « dû » dès la
// création : les deux pouvaient écrire à la même personne. D'où la
// réservation de lib/phishing/dispatch.ts, vérifiée ici.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/lib/db", async () => {
  const { base } = await import("@/lib/phishing/base-factice");
  return { db: base.db };
});
vi.mock("@/lib/smtp/sender", async () => {
  const { boite } = await import("@/lib/phishing/base-factice");
  return { sendMailViaTenantSmtp: boite.envoyer };
});
vi.mock("@/lib/auth", () => ({ auth: authMock }));
// recordCronRun est transparent : il exécute le travail et rend son résultat.
vi.mock("@/lib/cron/record", () => ({
  recordCronRun: (_nom: string, travail: () => Promise<unknown>) => travail(),
}));

import * as route from "./route";
import { base, boite } from "@/lib/phishing/base-factice";
import { launchPhishingCampaign } from "@/lib/phishing/launch";

const SECRET = "secret-de-test-assez-long-0123";
const URL_ROUTE = "http://app:3000/api/cron/phishing-drip";
const DEBUT = new Date("2026-11-05T10:30:00.000Z");
const MINUTE = 60_000;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;

const adresse = (id: string) => `${id}@exemple.test`;
const ilYA = (ms: number) => new Date(Date.now() - ms);
const dans = (ms: number) => new Date(Date.now() + ms);

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
  vi.setSystemTime(new Date(Date.now() + HEURE));
  return passage();
}

/** Une campagne étalée déjà lancée, sur un tenant de cinq personnes. */
function campagneEtalee(id = "c1", tenantId = "t1") {
  return base.ajouterCampagne({
    id,
    tenantId,
    scheduledAt: ilYA(JOUR),
    sentAt: ilYA(JOUR),
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(DEBUT);
  vi.clearAllMocks();
  authMock.mockResolvedValue(null);
  base.reinitialiser();
  boite.reinitialiser();
  base.ajouterTenant({ id: "t1", slug: "acme", name: "Acme" });
  for (const id of ["u1", "u2", "u3", "u4", "u5"]) {
    base.ajouterUtilisateur({ id, tenantId: "t1" });
  }
  process.env.CRON_SECRET = SECRET;
  process.env.NEXT_PUBLIC_APP_URL = "https://app.exemple.test";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("envoi des mails échus", () => {
  it("écrit aux personnes dont l'échéance est passée, et à elles seules", async () => {
    const c = campagneEtalee();
    const arretee = base.ajouterCampagne({
      id: "c2",
      tenantId: "t1",
      scheduledAt: ilYA(JOUR),
      isActive: false,
    });
    // Échu : à envoyer.
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u1",
      dripScheduledAt: ilYA(HEURE),
    });
    // Pas encore échu.
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u2",
      dripScheduledAt: dans(JOUR),
    });
    // Envoi immédiat, hors étalement : ce n'est pas l'affaire de ce cron.
    base.ajouterResultat({ campaignId: c.id, userId: "u3" });
    // Échu, mais déjà parti.
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u4",
      dripScheduledAt: ilYA(HEURE),
      mailDispatchedAt: ilYA(HEURE),
    });
    // Échu, mais la campagne a été arrêtée.
    base.ajouterResultat({
      campaignId: arretee.id,
      userId: "u5",
      dripScheduledAt: ilYA(HEURE),
    });

    const { corps } = await passage();

    expect(boite.recus()).toEqual({ [adresse("u1")]: 1 });
    expect(corps).toEqual({
      ok: true,
      picked: 1,
      sent: 1,
      failed: 0,
      reserved: 0,
      errors: [],
    });
    expect(base.resultatDe(c.id, "u1").mailDispatchedAt).toEqual(DEBUT);
  });

  it("envoie à chaque personne sa variante, avec son lien et son pixel", async () => {
    base.ajouterModele({
      tenantId: null,
      slug: "variante-b",
      name: "Variante B",
      emailSubject: "Sujet de la variante B",
      emailHtml: "<p>{firstName} : {trackingUrl}</p>",
      isActive: true,
    });
    const c = campagneEtalee();
    base.campagne(c.id).variantBSlug = "variante-b";
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u1",
      trackToken: "jetonB",
      variant: "B",
      dripScheduledAt: ilYA(HEURE),
    });

    await passage();

    expect(boite.envois[0]).toMatchObject({
      tenantId: "t1",
      to: adresse("u1"),
      subject: "Sujet de la variante B",
    });
    expect(boite.envois[0].html).toContain(
      "Prénom-u1 : https://app.exemple.test/phishing/jetonB",
    );
    expect(boite.envois[0].html).toContain(
      "https://app.exemple.test/api/phishing/track/open/jetonB",
    );
  });

  it("un envoi refusé reste dû et repart au passage suivant", async () => {
    const c = campagneEtalee();
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u1",
      dripScheduledAt: ilYA(HEURE),
    });
    boite.echouerPour(adresse("u1"));

    expect((await passage()).corps).toMatchObject({ sent: 0, failed: 1 });

    boite.reussirPour(adresse("u1"));
    expect((await passageSuivant()).corps).toMatchObject({
      sent: 1,
      failed: 0,
    });
    expect(boite.recus()).toEqual({ [adresse("u1")]: 1 });
  });

  it("désactive la campagne quand le SMTP du tenant est hors service", async () => {
    const c = campagneEtalee();
    for (const id of ["u1", "u2"]) {
      base.ajouterResultat({
        campaignId: c.id,
        userId: id,
        dripScheduledAt: ilYA(HEURE),
      });
    }
    boite.echouerPour(adresse("u1"), "smtp_decrypt_failed");

    const { corps } = await passage();

    expect(corps).toMatchObject({ sent: 0, failed: 1 });
    expect(corps.errors).toEqual([
      `${c.id}: SMTP HS, campagne marquee inactive`,
    ]);
    expect(base.campagne(c.id).isActive).toBe(false);
    expect(boite.envois).toHaveLength(0);
  });
});

describe("réservation", () => {
  it("laisse de côté un mail qu'un autre traitement est en train d'envoyer", async () => {
    const c = campagneEtalee();
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u1",
      dripScheduledAt: ilYA(MINUTE),
      mailAttemptedAt: ilYA(1000),
    });

    const { corps } = await passage();

    expect(corps).toMatchObject({ picked: 1, sent: 0, failed: 0, reserved: 1 });
    expect(boite.envois).toHaveLength(0);
  });

  it("le reprend quand ce traitement est mort sans avoir fini", async () => {
    const c = campagneEtalee();
    base.ajouterResultat({
      campaignId: c.id,
      userId: "u1",
      dripScheduledAt: ilYA(2 * HEURE),
      mailAttemptedAt: ilYA(2 * HEURE),
    });

    const { corps } = await passage();

    expect(corps).toMatchObject({ sent: 1, reserved: 0 });
    expect(boite.recus()).toEqual({ [adresse("u1")]: 1 });
  });
});

describe("de bout en bout, avec le vrai lancement étalé", () => {
  // Quatre destinataires sur deux jours : u1 et u3 partent au lancement,
  // u2 et u4 le lendemain.
  function lancer() {
    return launchPhishingCampaign({
      tenantId: "t1",
      templateId: "FAKE_MICROSOFT",
      targets: ["u1", "u2", "u3", "u4"].map((id) => ({
        id,
        email: adresse(id),
        name: `Prénom-${id} Nom`,
      })),
      dripStrategy: { dripDays: 2 },
    });
  }

  it("le passage qui tombe pendant le premier lot ne double personne", async () => {
    let pendant: Awaited<ReturnType<typeof passage>> | undefined;
    boite.avantChaqueEnvoi(async () => {
      if (!pendant) {
        pendant = { status: 0, corps: {} };
        pendant = await passage();
      }
    });

    await lancer();

    // u1 était entre les mains du lancement, u3 pas encore : le cron a
    // laissé le premier et envoyé le second, que le lancement n'a pas
    // renvoyé ensuite.
    expect(pendant?.corps).toMatchObject({ picked: 2, sent: 1, reserved: 1 });
    expect(boite.recus()).toEqual({ [adresse("u1")]: 1, [adresse("u3")]: 1 });
  });

  it("un lancement étalé coupé pendant son premier lot est terminé par ce cron", async () => {
    boite.couperPendantEnvoi(1);
    await expect(lancer()).rejects.toThrow("processus coupé");
    expect(boite.envois).toHaveLength(0);

    await passageSuivant();

    expect(boite.recus()).toEqual({ [adresse("u1")]: 1, [adresse("u3")]: 1 });

    // Le second lot part le lendemain, une fois chacun.
    vi.setSystemTime(new Date(Date.now() + JOUR));
    await passage();
    expect(boite.recus()).toEqual({
      [adresse("u1")]: 1,
      [adresse("u2")]: 1,
      [adresse("u3")]: 1,
      [adresse("u4")]: 1,
    });
  });
});

describe("accès", () => {
  function unMailDuParTenant() {
    base.ajouterTenant({ id: "t2", slug: "autre", name: "Autre" });
    base.ajouterUtilisateur({ id: "voisin", tenantId: "t2" });
    base.ajouterResultat({
      campaignId: campagneEtalee("c1", "t1").id,
      userId: "u1",
      dripScheduledAt: ilYA(HEURE),
    });
    base.ajouterResultat({
      campaignId: campagneEtalee("c2", "t2").id,
      userId: "voisin",
      dripScheduledAt: ilYA(HEURE),
    });
  }

  it("refuse sans secret ni session", async () => {
    unMailDuParTenant();

    const { status } = await passage({ "x-cron-secret": "mauvais-secret" });

    expect(status).toBe(401);
    expect(boite.envois).toHaveLength(0);
  });

  it("avec le secret, traite tous les tenants", async () => {
    unMailDuParTenant();

    await passage();

    expect(boite.recus()).toEqual({
      [adresse("u1")]: 1,
      [adresse("voisin")]: 1,
    });
  });

  it("déclenché par un admin, ne traite que son tenant", async () => {
    unMailDuParTenant();
    authMock.mockResolvedValue({ user: { role: "ADMIN", tenantId: "t1" } });

    const { status } = await passage({ "x-cron-secret": "" });

    expect(status).toBe(200);
    expect(boite.recus()).toEqual({ [adresse("u1")]: 1 });
  });
});
