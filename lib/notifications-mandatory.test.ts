// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests des notifications de saisons obligatoires (#751).
//
// Enjeux : (1) ne PAS spammer un apprenant — le certificat s'annonce une
// seule fois, la relance au plus une fois par semaine et par saison ;
// (2) ne pas rater une saison terminée ; (3) ne jamais envoyer réellement
// quand l'email n'est pas configuré.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    tenantSaisonConfig: { findMany: vi.fn() },
    progress: { findMany: vi.fn() },
    notificationLog: { findMany: vi.fn(), create: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  isEmailConfigured: vi.fn(),
}));

import {
  computeMandatoryProgress,
  notifyMandatoryForUser,
  type MandatoryNotifyResult,
} from "./notifications-mandatory";
import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email";

const dbMock = db as unknown as {
  tenantSaisonConfig: { findMany: ReturnType<typeof vi.fn> };
  progress: { findMany: ReturnType<typeof vi.fn> };
  notificationLog: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};
const sendEmailMock = sendEmail as unknown as ReturnType<typeof vi.fn>;
const isEmailConfiguredMock = isEmailConfigured as unknown as ReturnType<
  typeof vi.fn
>;

const USER = {
  id: "u1",
  tenantId: "t1",
  email: "alice@example.com",
  name: "Alice",
};

function emptyResult(): MandatoryNotifyResult {
  return {
    usersScanned: 0,
    remindersSent: 0,
    remindersSimulated: 0,
    certificatesSent: 0,
    certificatesSimulated: 0,
    errors: 0,
  };
}

/** Config d'une saison obligatoire avec n episodes publies. */
function saisonConfig(saisonId: string, title: string, episodes: number) {
  return {
    saisonId,
    saison: {
      title,
      slug: saisonId,
      episodes: Array.from({ length: episodes }, (_, i) => ({
        id: `${saisonId}-ep${i}`,
      })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.DEMO_MODE;
  isEmailConfiguredMock.mockReturnValue(true);
  sendEmailMock.mockResolvedValue({ ok: true });
  dbMock.notificationLog.findMany.mockResolvedValue([]);
  dbMock.notificationLog.create.mockResolvedValue({});
});

describe("computeMandatoryProgress", () => {
  it("compte les episodes distincts, sans doublon si un episode est rejoue", async () => {
    dbMock.tenantSaisonConfig.findMany.mockResolvedValue([
      saisonConfig("s1", "Phishing", 3),
    ]);
    dbMock.progress.findMany.mockResolvedValue([
      { saisonId: "s1", episodeId: "s1-ep0" },
      { saisonId: "s1", episodeId: "s1-ep0" }, // rejoue : ne compte qu'une fois
      { saisonId: "s1", episodeId: "s1-ep1" },
    ]);

    const res = await computeMandatoryProgress("u1", "t1");
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ doneEpisodes: 2, totalEpisodes: 3 });
  });

  it("ignore les saisons obligatoires sans episode publie (denominateur nul)", async () => {
    dbMock.tenantSaisonConfig.findMany.mockResolvedValue([
      saisonConfig("vide", "Saison vide", 0),
    ]);
    dbMock.progress.findMany.mockResolvedValue([]);

    expect(await computeMandatoryProgress("u1", "t1")).toEqual([]);
  });

  it("ne requete pas les progres si le tenant n'a aucune saison obligatoire", async () => {
    dbMock.tenantSaisonConfig.findMany.mockResolvedValue([]);

    expect(await computeMandatoryProgress("u1", "t1")).toEqual([]);
    expect(dbMock.progress.findMany).not.toHaveBeenCalled();
  });
});

describe("notifyMandatoryForUser — certificat prêt", () => {
  it("annonce le certificat quand une saison obligatoire est terminee", async () => {
    dbMock.tenantSaisonConfig.findMany.mockResolvedValue([
      saisonConfig("s1", "Phishing", 2),
    ]);
    dbMock.progress.findMany.mockResolvedValue([
      { saisonId: "s1", episodeId: "s1-ep0" },
      { saisonId: "s1", episodeId: "s1-ep1" },
    ]);

    const result = emptyResult();
    await notifyMandatoryForUser(USER, result);

    expect(result.certificatesSent).toBe(1);
    expect(result.remindersSent).toBe(0);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][0].subject).toContain("certificat");
    expect(dbMock.notificationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "CERTIFICATE_READY" }),
      }),
    );
  });

  it("n'annonce JAMAIS deux fois le certificat de la meme saison", async () => {
    dbMock.tenantSaisonConfig.findMany.mockResolvedValue([
      saisonConfig("s1", "Phishing", 1),
    ]);
    dbMock.progress.findMany.mockResolvedValue([
      { saisonId: "s1", episodeId: "s1-ep0" },
    ]);
    // Annonce il y a 400 jours : le cooldown du certificat est infini.
    dbMock.notificationLog.findMany.mockResolvedValue([
      {
        sentAt: new Date(Date.now() - 400 * 24 * 3600 * 1000),
        payload: { saisonId: "s1" },
      },
    ]);

    const result = emptyResult();
    await notifyMandatoryForUser(USER, result);

    expect(result.certificatesSent).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("notifyMandatoryForUser — relance", () => {
  beforeEach(() => {
    dbMock.tenantSaisonConfig.findMany.mockResolvedValue([
      saisonConfig("s1", "Phishing", 4),
      saisonConfig("s2", "Mots de passe", 4),
    ]);
    // s1 : 1/4 · s2 : 3/4 -> la plus avancee des deux est s2.
    dbMock.progress.findMany.mockResolvedValue([
      { saisonId: "s1", episodeId: "s1-ep0" },
      { saisonId: "s2", episodeId: "s2-ep0" },
      { saisonId: "s2", episodeId: "s2-ep1" },
      { saisonId: "s2", episodeId: "s2-ep2" },
    ]);
  });

  it("relance UNE seule fois, sur la saison la plus proche de la fin", async () => {
    const result = emptyResult();
    await notifyMandatoryForUser(USER, result);

    expect(result.remindersSent).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][0].subject).toContain("Mots de passe");
    // Il reste 1 module sur s2 : le sujet doit rester au singulier.
    expect(sendEmailMock.mock.calls[0][0].subject).toContain("1 module ");
  });

  it("respecte le cooldown de 7 jours par saison", async () => {
    dbMock.notificationLog.findMany.mockResolvedValue([
      {
        sentAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        payload: { saisonId: "s2" },
      },
    ]);

    const result = emptyResult();
    await notifyMandatoryForUser(USER, result);

    expect(result.remindersSent).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("relance a nouveau une fois le cooldown ecoule", async () => {
    dbMock.notificationLog.findMany.mockResolvedValue([
      {
        sentAt: new Date(Date.now() - 8 * 24 * 3600 * 1000),
        payload: { saisonId: "s2" },
      },
    ]);

    const result = emptyResult();
    await notifyMandatoryForUser(USER, result);

    expect(result.remindersSent).toBe(1);
  });

  it("ne confond pas les cooldowns de deux saisons distinctes", async () => {
    // Relance recente sur s1 uniquement : s2 doit rester relancable.
    dbMock.notificationLog.findMany.mockResolvedValue([
      {
        sentAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
        payload: { saisonId: "s1" },
      },
    ]);

    const result = emptyResult();
    await notifyMandatoryForUser(USER, result);

    expect(result.remindersSent).toBe(1);
    expect(sendEmailMock.mock.calls[0][0].subject).toContain("Mots de passe");
  });
});

describe("notifyMandatoryForUser — envoi desactive", () => {
  beforeEach(() => {
    dbMock.tenantSaisonConfig.findMany.mockResolvedValue([
      saisonConfig("s1", "Phishing", 2),
    ]);
    dbMock.progress.findMany.mockResolvedValue([
      { saisonId: "s1", episodeId: "s1-ep0" },
    ]);
  });

  it("simule sans envoyer en DEMO_MODE, mais journalise quand meme", async () => {
    process.env.DEMO_MODE = "true";

    const result = emptyResult();
    await notifyMandatoryForUser(USER, result);

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(result.remindersSimulated).toBe(1);
    expect(result.remindersSent).toBe(0);
    expect(dbMock.notificationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "simulated" }),
      }),
    );
  });

  it("simule aussi quand l'email n'est pas configure", async () => {
    isEmailConfiguredMock.mockReturnValue(false);

    const result = emptyResult();
    await notifyMandatoryForUser(USER, result);

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(result.remindersSimulated).toBe(1);
  });

  it("compte une erreur et ne journalise pas si l'envoi echoue", async () => {
    sendEmailMock.mockResolvedValue({ ok: false, reason: "smtp_down" });

    const result = emptyResult();
    await notifyMandatoryForUser(USER, result);

    expect(result.errors).toBe(1);
    expect(result.remindersSent).toBe(0);
    expect(dbMock.notificationLog.create).not.toHaveBeenCalled();
  });

  it("ne fait rien du tout si le tenant n'a aucune saison obligatoire", async () => {
    dbMock.tenantSaisonConfig.findMany.mockResolvedValue([]);

    const result = emptyResult();
    await notifyMandatoryForUser(USER, result);

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(dbMock.notificationLog.create).not.toHaveBeenCalled();
    expect(result).toEqual(emptyResult());
  });
});
