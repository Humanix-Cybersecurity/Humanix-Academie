// SPDX-License-Identifier: AGPL-3.0-or-later
//
// AIDE DE TEST. Une base en mémoire et une boîte d'envoi factice pour les
// traitements qui envoient les mails de phishing simulé : le lancement
// (lib/phishing/launch.ts) et les deux crons (phishing-launch,
// phishing-drip). Ce fichier n'est importé que par des *.test.ts.
//
// POURQUOI UN ÉTAT EN MÉMOIRE PLUTÔT QUE DES vi.fn()
//
//   Les défauts que ces tests encadrent ne se voient qu'en REJOUANT un
//   traitement sur l'état laissé par le précédent : un lancement coupé au
//   milieu puis le passage suivant du cron, ou deux traitements sur les
//   mêmes lignes. Un double qui renvoie des valeurs figées vérifie que le
//   code appelle Prisma comme prévu, pas que chaque personne reçoit un seul
//   message.
//
// CE QUE LA BASE IMITE, ET RIEN DE PLUS
//
//   Les opérations Prisma que ces traitements emploient, avec les filtres
//   qu'ils passent : égalité, null, lt/lte/gt/gte, in, not, OR et la
//   relation `campaign`. Deux propriétés du vrai schéma comptent pour la
//   logique et sont reproduites : un seul résultat par couple
//   campagne/destinataire, et un `updateMany` conditionnel qui lit et écrit
//   en une seule opération, comme un UPDATE ... WHERE. Toute autre forme
//   de requête lève une erreur : mieux vaut un test qui casse qu'un filtre
//   ignoré en silence.
//
// SIMULER UNE COUPURE
//
//   `base.couper()` fait échouer toute opération suivante, en base comme à
//   l'envoi : plus rien n'est écrit ni expédié, ce qui laisse l'état qu'un
//   processus tué aurait laissé. `base.retablir()` représente le
//   redémarrage. `boite.couperPendantEnvoi(n)` et `boite.couperApresEnvoi(n)`
//   placent la coupure autour du n-ième envoi, `base.couperApresEcriture(n)`
//   juste après la n-ième écriture en base.

type Ligne = Record<string, unknown>;
type Lecture = (ligne: Ligne) => Ligne | undefined;

export type TenantFactice = { id: string; slug: string; name: string };

export type UtilisateurFactice = {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
};

export type CampagneFactice = {
  id: string;
  tenantId: string;
  title: string;
  template: string;
  channel: string;
  variantBSlug: string | null;
  scheduledAt: Date;
  sentAt: Date | null;
  isActive: boolean;
};

export type ResultatFactice = {
  id: string;
  campaignId: string;
  userId: string;
  trackToken: string;
  status: string;
  sentAt: Date;
  variant: string;
  dripScheduledAt: Date | null;
  mailDispatchedAt: Date | null;
  mailAttemptedAt: Date | null;
};

export type ModeleFactice = {
  tenantId: string | null;
  slug: string;
  name: string;
  emailSubject: string;
  emailHtml: string;
  isActive: boolean;
};

export type MailFactice = {
  tenantId: string;
  to: string;
  subject: string;
  html: string;
};

const COUPURE = "processus coupé (simulation)";

// ---------------------------------------------------------------------
// Filtres
// ---------------------------------------------------------------------

function brut(v: unknown): unknown {
  return v instanceof Date ? v.getTime() : v;
}

function compare(champ: unknown, borne: unknown, op: string): boolean {
  // Comme en SQL : une comparaison avec NULL n'est jamais vraie.
  if (champ === null || champ === undefined) return false;
  const a = brut(champ) as number;
  const b = brut(borne) as number;
  if (op === "lt") return a < b;
  if (op === "lte") return a <= b;
  if (op === "gt") return a > b;
  return a >= b;
}

function condition(champ: unknown, attendu: unknown): boolean {
  if (attendu === null) return champ === null || champ === undefined;
  if (attendu instanceof Date || typeof attendu !== "object") {
    return brut(champ) === brut(attendu);
  }
  for (const [op, borne] of Object.entries(attendu as Ligne)) {
    if (op === "lt" || op === "lte" || op === "gt" || op === "gte") {
      if (!compare(champ, borne, op)) return false;
    } else if (op === "in") {
      if (!(borne as unknown[]).includes(champ)) return false;
    } else if (op === "not") {
      if (condition(champ, borne)) return false;
    } else if (op === "equals") {
      if (!condition(champ, borne)) return false;
    } else {
      throw new Error(`base factice : opérateur non géré « ${op} »`);
    }
  }
  return true;
}

function correspond(
  ligne: Ligne,
  where: Ligne | undefined,
  relations: Record<string, Lecture> = {},
): boolean {
  if (!where) return true;
  for (const [cle, attendu] of Object.entries(where)) {
    // Prisma ignore une clé dont la valeur est undefined.
    if (attendu === undefined) continue;
    if (cle === "OR") {
      const branches = attendu as Ligne[];
      if (!branches.some((w) => correspond(ligne, w, relations))) return false;
    } else if (cle in relations) {
      const liee = relations[cle](ligne);
      if (!liee || !correspond(liee, attendu as Ligne)) return false;
    } else if (!(cle in ligne)) {
      throw new Error(`base factice : champ inconnu « ${cle} »`);
    } else if (!condition(ligne[cle], attendu)) {
      return false;
    }
  }
  return true;
}

function trier<T extends Ligne>(lignes: T[], orderBy: unknown): T[] {
  if (!orderBy) return lignes;
  const [[champ, sens]] = Object.entries(orderBy as Record<string, string>);
  const signe = sens === "desc" ? -1 : 1;
  return [...lignes].sort((x, y) => {
    const a = brut(x[champ]) as number;
    const b = brut(y[champ]) as number;
    return a < b ? -signe : a > b ? signe : 0;
  });
}

// ---------------------------------------------------------------------
// La base
// ---------------------------------------------------------------------

type Requete = {
  where?: Ligne;
  data?: Ligne;
  include?: Ligne;
  select?: Ligne;
  orderBy?: unknown;
  take?: number;
  skipDuplicates?: boolean;
};

function creerBase() {
  const tenants = new Map<string, TenantFactice>();
  const utilisateurs: UtilisateurFactice[] = [];
  const campagnes: CampagneFactice[] = [];
  const resultats: ResultatFactice[] = [];
  const modeles: ModeleFactice[] = [];
  const smtp = new Set<string>();
  const evenements: Ligne[] = [];
  let coupee = false;
  let compteur = 0;
  let ecritures = 0;
  let coupureApresEcriture = 0;

  const id = (prefixe: string) => `${prefixe}${++compteur}`;

  function garde() {
    if (coupee) throw new Error(COUPURE);
  }

  /** À appeler à la fin de chaque écriture, une fois l'état modifié. */
  function ecrit() {
    if (++ecritures === coupureApresEcriture) coupee = true;
  }

  const campagneDe: Lecture = (r) =>
    campagnes.find((c) => c.id === r.campaignId) as Ligne | undefined;

  function trouverCampagne(where: Ligne | undefined): CampagneFactice {
    const c = campagnes.find((x) => x.id === where?.id);
    if (!c) throw new Error(`base factice : campagne ${where?.id} absente`);
    return c;
  }

  function trouverResultat(where: Ligne | undefined): ResultatFactice {
    const r = resultats.find((x) => x.id === where?.id);
    if (!r) throw new Error(`base factice : résultat ${where?.id} absent`);
    return r;
  }

  function nouveauResultat(d: Ligne): ResultatFactice {
    return {
      id: (d.id as string) ?? id("r"),
      campaignId: d.campaignId as string,
      userId: d.userId as string,
      trackToken: (d.trackToken as string) ?? id("jeton"),
      status: (d.status as string) ?? "SENT",
      sentAt: (d.sentAt as Date) ?? new Date(),
      variant: (d.variant as string) ?? "A",
      dripScheduledAt: (d.dripScheduledAt as Date | null) ?? null,
      mailDispatchedAt: (d.mailDispatchedAt as Date | null) ?? null,
      mailAttemptedAt: (d.mailAttemptedAt as Date | null) ?? null,
    };
  }

  function dejaLa(r: ResultatFactice, autres: ResultatFactice[]): boolean {
    return autres.some(
      (x) => x.campaignId === r.campaignId && x.userId === r.userId,
    );
  }

  function avecLiens(r: ResultatFactice, include: Ligne | undefined): Ligne {
    const ligne: Ligne = { ...r };
    if (include?.user) {
      ligne.user = { ...utilisateurs.find((u) => u.id === r.userId) };
    }
    if (include?.campaign) ligne.campaign = { ...campagneDe(r) };
    return ligne;
  }

  const db = {
    phishingCampaign: {
      async findMany(q: Requete = {}) {
        garde();
        const lignes = trier(
          campagnes.filter((c) => correspond(c, q.where)),
          q.orderBy,
        ).slice(0, q.take ?? campagnes.length);
        return lignes.map((c) => ({
          ...c,
          ...(q.include?.tenant ? { tenant: tenants.get(c.tenantId) } : {}),
        }));
      },
      async update(q: Requete) {
        garde();
        const c = trouverCampagne(q.where);
        Object.assign(c, q.data);
        ecrit();
        return { ...c };
      },
      async create(q: Requete) {
        garde();
        const { results, ...champs } = q.data as Ligne;
        const campagne: CampagneFactice = {
          id: id("c"),
          tenantId: champs.tenantId as string,
          title: champs.title as string,
          template: champs.template as string,
          channel: (champs.channel as string) ?? "EMAIL",
          variantBSlug: (champs.variantBSlug as string | null) ?? null,
          scheduledAt: champs.scheduledAt as Date,
          sentAt: (champs.sentAt as Date | null) ?? null,
          isActive: (champs.isActive as boolean) ?? true,
        };
        // Écriture imbriquée (`results: { createMany: { data } }`) : tout
        // ou rien, comme la transaction que Prisma ouvre pour un `create`
        // qui porte des relations.
        const imbriques = ((
          (results as Ligne | undefined)?.createMany as Ligne | undefined
        )?.data ?? []) as Ligne[];
        const nouveaux: ResultatFactice[] = [];
        for (const d of imbriques) {
          const r = nouveauResultat({ ...d, campaignId: campagne.id });
          if (dejaLa(r, nouveaux)) {
            throw new Error("base factice : résultat en double (P2002)");
          }
          nouveaux.push(r);
        }
        campagnes.push(campagne);
        resultats.push(...nouveaux);
        ecrit();
        return {
          ...campagne,
          ...(q.include?.results
            ? { results: nouveaux.map((r) => ({ ...r })) }
            : {}),
        };
      },
    },

    phishingResult: {
      async findMany(q: Requete = {}) {
        garde();
        return trier(
          resultats.filter((r) =>
            correspond(r, q.where, { campaign: campagneDe }),
          ),
          q.orderBy,
        )
          .slice(0, q.take ?? resultats.length)
          .map((r) => avecLiens(r, q.include));
      },
      async count(q: Requete = {}) {
        garde();
        return resultats.filter((r) =>
          correspond(r, q.where, { campaign: campagneDe }),
        ).length;
      },
      async createMany(q: Requete & { data: Ligne[] }) {
        garde();
        let count = 0;
        for (const d of q.data) {
          const r = nouveauResultat(d);
          if (dejaLa(r, resultats)) {
            if (q.skipDuplicates) continue;
            throw new Error("base factice : résultat en double (P2002)");
          }
          resultats.push(r);
          count++;
        }
        ecrit();
        return { count };
      },
      async update(q: Requete) {
        garde();
        const r = trouverResultat(q.where);
        Object.assign(r, q.data);
        ecrit();
        return { ...r };
      },
      // Lecture et écriture sans `await` entre les deux : deux appels
      // concurrents ne peuvent pas tous deux satisfaire le même filtre.
      async updateMany(q: Requete) {
        garde();
        const cibles = resultats.filter((r) =>
          correspond(r, q.where, { campaign: campagneDe }),
        );
        for (const r of cibles) Object.assign(r, q.data);
        ecrit();
        return { count: cibles.length };
      },
    },

    user: {
      async findMany(q: Requete = {}) {
        garde();
        return utilisateurs
          .filter((u) => correspond(u, q.where))
          .map((u) => ({ ...u }));
      },
    },

    tenantSmtpConfig: {
      async findUnique(q: Requete) {
        garde();
        const tenantId = q.where?.tenantId as string;
        return smtp.has(tenantId) ? { id: `smtp-${tenantId}` } : null;
      },
    },

    phishingEmailTemplate: {
      async findFirst(q: Requete = {}) {
        garde();
        const m = modeles.find((x) => correspond(x, q.where));
        if (!m) return null;
        return {
          ...m,
          emoji: "🎣",
          difficulty: "medium",
          emailFromAddr: "it@exemple.test",
          emailFromName: "Service IT",
          markers: [],
          remediationSaisonSlug: null,
          remediationEpisodeSlug: null,
          remediationLabel: null,
          remediationDurationMinutes: null,
          landingFakeHtml: null,
          landingTitle: null,
        };
      },
    },

    event: {
      async create(q: Requete) {
        garde();
        evenements.push(q.data as Ligne);
        ecrit();
        return q.data;
      },
    },
  };

  return {
    db,

    // --- État initial d'un test ---
    reinitialiser() {
      tenants.clear();
      utilisateurs.length = 0;
      campagnes.length = 0;
      resultats.length = 0;
      modeles.length = 0;
      smtp.clear();
      evenements.length = 0;
      coupee = false;
      compteur = 0;
      ecritures = 0;
      coupureApresEcriture = 0;
    },
    ajouterTenant(t: TenantFactice, avecSmtp = true) {
      tenants.set(t.id, t);
      if (avecSmtp) smtp.add(t.id);
    },
    ajouterUtilisateur(
      u: Pick<UtilisateurFactice, "id" | "tenantId"> &
        Partial<UtilisateurFactice>,
    ): UtilisateurFactice {
      const utilisateur: UtilisateurFactice = {
        email: `${u.id}@exemple.test`,
        name: `Prénom-${u.id} Nom`,
        role: "LEARNER",
        isActive: true,
        ...u,
      };
      utilisateurs.push(utilisateur);
      return utilisateur;
    },
    ajouterCampagne(
      c: Pick<CampagneFactice, "tenantId" | "scheduledAt"> &
        Partial<CampagneFactice>,
    ): CampagneFactice {
      const campagne: CampagneFactice = {
        id: id("c"),
        title: "Campagne de test",
        template: "FAKE_MICROSOFT",
        channel: "EMAIL",
        variantBSlug: null,
        sentAt: null,
        isActive: true,
        ...c,
      };
      campagnes.push(campagne);
      return campagne;
    },
    ajouterResultat(
      r: Pick<ResultatFactice, "campaignId" | "userId"> &
        Partial<ResultatFactice>,
    ): ResultatFactice {
      const resultat = nouveauResultat(r);
      resultats.push(resultat);
      return resultat;
    },
    ajouterModele(m: ModeleFactice) {
      modeles.push(m);
    },

    // --- Coupure ---
    couper() {
      coupee = true;
    },
    retablir() {
      coupee = false;
    },
    /** Coupe juste après la n-ième écriture à venir. */
    couperApresEcriture(n: number) {
      coupureApresEcriture = ecritures + n;
    },
    estCoupee: () => coupee,

    // --- Lecture de l'état final ---
    campagne: (campagneId: string) => trouverCampagne({ id: campagneId }),
    resultats: (campagneId?: string) =>
      resultats.filter((r) => !campagneId || r.campaignId === campagneId),
    resultatDe(campagneId: string, userId: string): ResultatFactice {
      const r = resultats.find(
        (x) => x.campaignId === campagneId && x.userId === userId,
      );
      if (!r) throw new Error(`aucun résultat pour ${userId}`);
      return r;
    },
    campagnes: () => campagnes,
    evenements: () => evenements,
  };
}

export const base = creerBase();

// ---------------------------------------------------------------------
// La boîte d'envoi
// ---------------------------------------------------------------------

type IssueSmtp =
  | { ok: true; messageId: string }
  | { ok: false; reason: string; details?: string };

function creerBoite() {
  const envois: MailFactice[] = [];
  const echecs = new Map<string, string>();
  let coupurePendant = 0;
  let coupureApres = 0;
  let tentatives = 0;
  let avantEnvoi: ((mail: MailFactice) => Promise<void> | void) | null = null;

  return {
    envois,

    /** Remplace sendMailViaTenantSmtp : même signature, même contrat. */
    async envoyer(
      tenantId: string,
      mail: { to: string; subject: string; html: string },
    ): Promise<IssueSmtp> {
      if (base.estCoupee()) throw new Error(COUPURE);
      tentatives++;
      const courrier = { tenantId, ...mail };
      if (avantEnvoi) await avantEnvoi(courrier);
      // Coupure AVANT que le serveur SMTP ait accepté le message.
      if (tentatives === coupurePendant) {
        base.couper();
        throw new Error(COUPURE);
      }
      const raison = echecs.get(mail.to);
      if (raison) return { ok: false, reason: raison, details: "simulé" };
      envois.push(courrier);
      // Coupure APRÈS l'acceptation, avant que l'appelant ait pu en
      // garder la trace : le message est parti, la marque non.
      if (tentatives === coupureApres) base.couper();
      return { ok: true, messageId: `msg-${envois.length}` };
    },

    reinitialiser() {
      envois.length = 0;
      echecs.clear();
      coupurePendant = 0;
      coupureApres = 0;
      tentatives = 0;
      avantEnvoi = null;
    },
    /** Le n-ième envoi (compté depuis le dernier `reinitialiser`) est coupé. */
    couperPendantEnvoi(n: number) {
      coupurePendant = tentatives + n;
    },
    couperApresEnvoi(n: number) {
      coupureApres = tentatives + n;
    },
    echouerPour(email: string, raison = "smtp_send_failed") {
      echecs.set(email, raison);
    },
    reussirPour(email: string) {
      echecs.delete(email);
    },
    /** Action à exécuter au début de chaque envoi (traitement concurrent). */
    avantChaqueEnvoi(action: (mail: MailFactice) => Promise<void> | void) {
      avantEnvoi = action;
    },

    /** Nombre de messages reçus par adresse. */
    recus(): Record<string, number> {
      const parAdresse: Record<string, number> = {};
      for (const e of envois) parAdresse[e.to] = (parAdresse[e.to] ?? 0) + 1;
      return parAdresse;
    },
  };
}

export const boite = creerBoite();
