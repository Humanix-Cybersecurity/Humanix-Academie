// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de dispatchLure : l'envoi d'un mail de phishing simulé, avec la
// réservation qui empêche deux traitements d'écrire à la même personne.
// La règle et ses raisons sont en tête de lib/phishing/dispatch.ts.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", async () => {
  const { base } = await import("@/lib/phishing/base-factice");
  return { db: base.db };
});
vi.mock("@/lib/smtp/sender", async () => {
  const { boite } = await import("@/lib/phishing/base-factice");
  return { sendMailViaTenantSmtp: boite.envoyer };
});

import { ATTEMPT_LEASE_MS, dispatchLure } from "./dispatch";
import { base, boite, type ResultatFactice } from "./base-factice";

const DEBUT = new Date("2026-11-05T10:00:00.000Z");
const MINUTE = 60_000;

const MODELE = {
  emailSubject: "Votre colis est en attente",
  emailHtmlTemplate:
    "<p>Bonjour {firstName}, <a href='{trackingUrl}'>ici</a></p>",
};

const ilYA = (ms: number) => new Date(Date.now() - ms);

function plusTard(ms: number) {
  vi.setSystemTime(new Date(Date.now() + ms));
}

/** Un résultat prêt à partir, dans l'état voulu. */
function resultat(etat: Partial<ResultatFactice> = {}): ResultatFactice {
  return base.ajouterResultat({
    campaignId: "c1",
    userId: "u1",
    trackToken: "jeton1",
    ...etat,
  });
}

function envoyer(r: ResultatFactice) {
  return dispatchLure({
    resultId: r.id,
    trackToken: r.trackToken,
    tenantId: "t1",
    template: MODELE,
    recipient: { email: "ada@exemple.test", name: "Ada Lovelace" },
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(DEBUT);
  base.reinitialiser();
  boite.reinitialiser();
  base.ajouterTenant({ id: "t1", slug: "acme", name: "Acme" });
  base.ajouterCampagne({ id: "c1", tenantId: "t1", scheduledAt: DEBUT });
  process.env.NEXT_PUBLIC_APP_URL = "https://app.exemple.test/";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("dispatchLure", () => {
  it("envoie le message personnalisé, avec son lien et son pixel de suivi", async () => {
    const r = resultat();

    const issue = await envoyer(r);

    expect(issue).toEqual({ status: "sent" });
    expect(boite.envois).toEqual([
      {
        tenantId: "t1",
        to: "ada@exemple.test",
        subject: "Votre colis est en attente",
        html: expect.stringContaining(
          "Bonjour Ada, <a href='https://app.exemple.test/phishing/jeton1'>",
        ),
      },
    ]);
    expect(boite.envois[0].html).toContain(
      'src="https://app.exemple.test/api/phishing/track/open/jeton1"',
    );
  });

  it("note la tentative, puis l'envoi", async () => {
    const r = resultat();

    await envoyer(r);

    expect(r.mailAttemptedAt).toEqual(DEBUT);
    expect(r.mailDispatchedAt).toEqual(DEBUT);
  });

  it("ne renvoie pas un message déjà parti", async () => {
    const r = resultat({
      mailAttemptedAt: ilYA(3 * 60 * MINUTE),
      mailDispatchedAt: ilYA(3 * 60 * MINUTE),
    });

    expect(await envoyer(r)).toEqual({ status: "taken" });
    expect(boite.envois).toHaveLength(0);
  });

  it("s'abstient quand un autre traitement tient le message", async () => {
    const r = resultat({ mailAttemptedAt: ilYA(MINUTE) });

    expect(await envoyer(r)).toEqual({ status: "taken" });
    expect(boite.envois).toHaveLength(0);
    // La réservation de l'autre traitement n'est pas écrasée.
    expect(r.mailAttemptedAt).toEqual(ilYA(MINUTE));
  });

  it("reprend le message quand la réservation a expiré", async () => {
    const r = resultat({ mailAttemptedAt: ilYA(ATTEMPT_LEASE_MS + 1) });

    expect(await envoyer(r)).toEqual({ status: "sent" });
    expect(boite.envois).toHaveLength(1);
  });

  it("tient la réservation jusqu'à dix minutes incluses", async () => {
    // Le cron phishing-launch lit « tentative de dix minutes ou moins » comme
    // un traitement en cours : les deux bornes doivent se compléter.
    const r = resultat({ mailAttemptedAt: ilYA(ATTEMPT_LEASE_MS) });

    expect(await envoyer(r)).toEqual({ status: "taken" });
  });

  it("de deux appels concurrents, un seul envoie", async () => {
    const r = resultat();

    const issues = await Promise.all([envoyer(r), envoyer(r)]);

    expect(issues.map((i) => i.status).sort()).toEqual(["sent", "taken"]);
    expect(boite.envois).toHaveLength(1);
  });

  it("un envoi refusé reste à faire et garde sa réservation", async () => {
    const r = resultat();
    boite.echouerPour("ada@exemple.test", "smtp_connect_failed");

    expect(await envoyer(r)).toEqual({
      status: "failed",
      reason: "smtp_connect_failed",
      details: "simulé",
    });
    expect(r.mailDispatchedAt).toBeNull();
    expect(r.mailAttemptedAt).toEqual(DEBUT);

    // Tant que la réservation tient, personne ne retente.
    boite.reussirPour("ada@exemple.test");
    plusTard(MINUTE);
    expect(await envoyer(r)).toEqual({ status: "taken" });

    // Au passage suivant des crons, une heure après, elle a expiré.
    plusTard(59 * MINUTE);
    expect(await envoyer(r)).toEqual({ status: "sent" });
    expect(boite.envois).toHaveLength(1);
  });

  it("coupé avant que le serveur ait accepté le message, il sera repris sans doublon", async () => {
    const r = resultat();
    boite.couperPendantEnvoi(1);

    await expect(envoyer(r)).rejects.toThrow("processus coupé");
    expect(r.mailDispatchedAt).toBeNull();

    base.retablir();
    plusTard(60 * MINUTE);
    expect(await envoyer(r)).toEqual({ status: "sent" });
    expect(boite.envois).toHaveLength(1);
  });

  it("coupé entre l'acceptation du message et sa trace, il sera repris : un doublon, un seul", async () => {
    const r = resultat();
    boite.couperApresEnvoi(1);

    await expect(envoyer(r)).rejects.toThrow("processus coupé");
    expect(boite.envois).toHaveLength(1);
    expect(r.mailDispatchedAt).toBeNull();

    base.retablir();
    plusTard(60 * MINUTE);
    expect(await envoyer(r)).toEqual({ status: "sent" });
    expect(await envoyer(r)).toEqual({ status: "taken" });
    expect(boite.envois).toHaveLength(2);
  });
});
