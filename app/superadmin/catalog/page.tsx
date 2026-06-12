// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /superadmin/catalog -- Re-importer le catalog partage.
//
// Page protegee SUPERADMIN (layout parent). Affiche :
//   - Etat actuel BDD (counts saisons / episodes / badges / items boutique)
//   - Etat attendu (counts dans les catalogs TS, lus a la compilation)
//   - Bouton "Re-importer" qui declenche reseedCatalogAction()
//   - Resultat du dernier re-seed (audit log)
//
// Quand cliquer ? Apres un deploy qui a ajoute / modifie :
//   - prisma/catalog-saisons.ts (saisons, episodes)
//   - lib/shop.ts (items boutique)
//   - lib/achievements/catalog.ts (badges)
//
// Sans clic, le contenu code n'arrive PAS automatiquement en BDD prod (le
// docker-entrypoint.sh ne lance pas le seed en prod -- only en demo mode).

import { db } from "@/lib/db";
import { SHOP_CATALOG } from "@/lib/shop";
import { ACHIEVEMENTS_CATALOG } from "@/lib/achievements/catalog";
import {
  loadCatalogSaisons,
  isCommercialCatalogAvailable,
} from "@/prisma/seed-data-loader";
import { getCatalogReport, type CatalogReport } from "@/lib/catalog-runner";
import { ReseedCatalogForm } from "./ReseedCatalogForm";

/**
 * Fallback in-process (résolution bundlée) si le sous-process tsx échoue.
 * En dev local / fork OSS, c'est correct ; en prod commerciale, ça peut sous-
 * estimer (demo) — mais on n'arrive ici que si tsx est indisponible.
 */
function buildInProcessReport(): CatalogReport {
  const { saisons, source } = loadCatalogSaisons();
  return {
    source,
    demoMode: process.env.DEMO_MODE === "true",
    commercialAvailable: isCommercialCatalogAvailable(),
    saisons: saisons.length,
    episodes: saisons.reduce((n, s) => n + s.episodes.length, 0),
    badges: ACHIEVEMENTS_CATALOG.length,
    items: SHOP_CATALOG.length,
  };
}

export const dynamic = "force-dynamic";

export default async function SuperadminCatalogPage() {
  // Counts actuels en BDD
  const [
    saisonsInDb,
    episodesInDb,
    badgesInDb,
    shopItemsInDb,
    lastReseed,
  ] = await Promise.all([
    db.saison.count(),
    db.episode.count(),
    db.achievement.count(),
    db.shopItem.count(),
    db.auditLog.findFirst({
      where: { action: "CATALOG_RESEEDED" },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        outcome: true,
        message: true,
        actorEmail: true,
        metadata: true,
      },
    }),
  ]);

  // Counts attendus depuis le code.
  //
  // On passe par un SOUS-PROCESS tsx (getCatalogReport) : le bundle serveur
  // Next ne résout pas fiablement le symlink prisma/catalog-saisons.ts ->
  // content-pro, donc loadCatalogSaisons() appelé in-process verrait "demo" à
  // tort. tsx lit le .ts sur disque et voit le commercial (comme le boot-seed).
  // Fallback in-process si le sous-process échoue (dev local / fork OSS).
  const report = await getCatalogReport();
  const codeView = report ?? buildInProcessReport();
  const catalogSource = codeView.source;
  const expectedSaisons = codeView.saisons;
  const expectedEpisodes = codeView.episodes;
  const expectedBadges = codeView.badges;
  const expectedItems = codeView.items;

  // Le seeder est ADDITIF (upsert par slug, ne supprime JAMAIS pour protéger
  // les UserProgress/UserAchievement). On distingue donc deux cas, et un seul
  // est un vrai « drift » actionnable :
  //   - code > BDD  -> il MANQUE des entités en BDD qu'un re-import ajoutera
  //                    (drift actionnable).
  //   - BDD > code  -> la BDD a des entités EN PLUS (ex. les 5 saisons démo
  //                    cumulées à un seed commercial). Un re-import ne les
  //                    retire PAS : c'est normal et bénin, surtout PAS une
  //                    raison de re-seeder.
  const missingInDb =
    Math.max(0, expectedSaisons - saisonsInDb) +
    Math.max(0, expectedEpisodes - episodesInDb) +
    Math.max(0, expectedBadges - badgesInDb) +
    Math.max(0, expectedItems - shopItemsInDb);
  const extraInDb =
    Math.max(0, saisonsInDb - expectedSaisons) +
    Math.max(0, episodesInDb - expectedEpisodes) +
    Math.max(0, badgesInDb - expectedBadges) +
    Math.max(0, shopItemsInDb - expectedItems);
  const hasActionableDrift = missingInDb > 0;

  // Diagnostic de la SOURCE du catalogue. Si l'instance résout en "demo"
  // alors qu'on attend du commercial, on veut savoir POURQUOI :
  //   - DEMO_MODE=true force le démo (même si content-pro présent), ou
  //   - content-pro absent de l'image (ex. image OSS) -> fallback démo.
  const demoModeEnv = codeView.demoMode;
  const commercialAvailable = codeView.commercialAvailable;
  // On "attend" du commercial dès que le catalogue commercial est embarqué
  // dans l'image (sinon c'est un fork/démo OSS, et "demo" est normal).
  const sourceIssue =
    catalogSource === "demo" && (demoModeEnv || commercialAvailable);
  const sourceReason = demoModeEnv
    ? "DEMO_MODE=true force le catalogue démo (5 saisons). Pose DEMO_MODE=false dans l'environnement de prod, puis redéploie/reseed."
    : !commercialAvailable
      ? "Le catalogue commercial (content-pro) est ABSENT de cette image — c'est typiquement une image OSS. La prod doit tourner une image buildée AVEC le submodule content-pro."
      : "Catalogue commercial chargé.";

  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
          Maintenance plateforme
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
          Catalog partagé
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Synchronise le contenu code → BDD (saisons, épisodes, badges, items boutique).
          Idempotent : ré-exécuter est sans danger.
        </p>
      </header>

      {/* Bandeau drift */}
      {hasActionableDrift ? (
        <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-4">
          <p className="font-bold text-amber-900 dark:text-amber-200">
            ⚠️ Des entités du code manquent en BDD
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
            {missingInDb} entité(s) définie(s) dans le code ne sont pas encore en
            BDD. Un re-import les ajoutera (idempotent).
          </p>
        </div>
      ) : extraInDb > 0 ? (
        <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 p-4">
          <p className="font-bold text-emerald-900 dark:text-emerald-200">
            ✅ BDD synchronisée avec le code
          </p>
          <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
            Tout le contenu du code est présent. La BDD contient en plus{" "}
            {extraInDb} entité(s) qui ne sont pas dans le catalogue actif (ex.
            saisons démo cumulées au commercial) — c&apos;est normal : le seed
            est additif et ne supprime jamais. Aucun re-import nécessaire.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 p-4">
          <p className="font-bold text-emerald-900 dark:text-emerald-200">
            ✅ BDD synchronisée avec le code
          </p>
          <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
            Aucun écart. Re-importer reste safe (idempotent) mais pas nécessaire.
          </p>
        </div>
      )}

      {/* Comparaison code vs BDD */}
      <section
        aria-labelledby="counts-title"
        className="card border border-gray-200 dark:border-slate-700"
      >
        <h2
          id="counts-title"
          className="font-display text-lg font-extrabold text-gray-700 dark:text-gray-200 mb-4"
        >
          Comparaison code ↔ BDD
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Source catalog : <strong>{catalogSource}</strong>
        </p>

        {/* Diagnostic source : explique POURQUOI on est en démo le cas échéant */}
        <div
          className={`mb-4 rounded-xl border p-3 text-sm ${
            sourceIssue
              ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-200"
              : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40 text-gray-700 dark:text-gray-300"
          }`}
        >
          <p className="font-semibold mb-1">
            {sourceIssue
              ? "⚠️ Source = démo alors qu'on attend le catalogue commercial"
              : "Diagnostic de la source"}
          </p>
          <ul className="space-y-0.5 font-mono text-xs">
            <li>
              DEMO_MODE = <strong>{demoModeEnv ? "true" : "false"}</strong>
            </li>
            <li>
              content-pro (catalogue commercial) ={" "}
              <strong>{commercialAvailable ? "présent" : "ABSENT"}</strong>
            </li>
          </ul>
          <p className="mt-2">{sourceReason}</p>
          {sourceIssue && (
            <p className="mt-1 text-xs">
              Tant que la source est « démo », les saisons commerciales ne sont
              pas seedées → leurs épisodes renvoient 404 (ex.{" "}
              <code>/apprendre/enfants-numerique-famille/01-premiere-tablette</code>
              ).
            </p>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700 text-left">
              <th className="py-2 font-semibold">Entité</th>
              <th className="py-2 font-semibold text-right">Dans le code</th>
              <th className="py-2 font-semibold text-right">En BDD</th>
              <th className="py-2 font-semibold text-right">Écart</th>
            </tr>
          </thead>
          <tbody>
            <CountRow label="Saisons" code={expectedSaisons} db={saisonsInDb} />
            <CountRow label="Épisodes" code={expectedEpisodes} db={episodesInDb} />
            <CountRow label="Badges" code={expectedBadges} db={badgesInDb} />
            <CountRow label="Items boutique" code={expectedItems} db={shopItemsInDb} />
          </tbody>
        </table>
      </section>

      {/* Form bouton */}
      <ReseedCatalogForm />

      {/* Dernier re-seed audit */}
      {lastReseed && (
        <section
          aria-labelledby="last-reseed-title"
          className="card border border-gray-200 dark:border-slate-700"
        >
          <h2
            id="last-reseed-title"
            className="font-display text-base font-extrabold text-gray-700 dark:text-gray-200 mb-3"
          >
            Dernier re-import
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500 dark:text-gray-400">Date</dt>
            <dd>{lastReseed.createdAt.toLocaleString("fr-FR")}</dd>
            <dt className="text-gray-500 dark:text-gray-400">Résultat</dt>
            <dd>
              <span
                className={
                  lastReseed.outcome === "SUCCESS"
                    ? "text-emerald-700 dark:text-emerald-300 font-bold"
                    : "text-red-700 dark:text-red-300 font-bold"
                }
              >
                {lastReseed.outcome}
              </span>
            </dd>
            <dt className="text-gray-500 dark:text-gray-400">Opérateur</dt>
            <dd>{lastReseed.actorEmail ?? "—"}</dd>
            <dt className="text-gray-500 dark:text-gray-400">Détail</dt>
            <dd className="text-gray-700 dark:text-gray-300">
              {lastReseed.message ?? "—"}
            </dd>
          </dl>
        </section>
      )}
    </div>
  );
}

function CountRow({
  label,
  code,
  db,
}: {
  label: string;
  code: number;
  db: number;
}) {
  // gap = BDD − code. >0 : entités EN PLUS en BDD (bénin, le seed additif ne
  // les retire pas). <0 : entités MANQUANTES en BDD (un re-import les ajoute).
  const gap = db - code;
  return (
    <tr className="border-b border-gray-100 dark:border-slate-800 last:border-0">
      <td className="py-2">{label}</td>
      <td className="py-2 text-right tabular-nums">{code}</td>
      <td className="py-2 text-right tabular-nums">{db}</td>
      <td
        className={`py-2 text-right tabular-nums font-bold ${
          gap === 0
            ? "text-gray-400"
            : gap > 0
              ? "text-slate-500 dark:text-slate-400"
              : "text-amber-600 dark:text-amber-400"
        }`}
      >
        {gap === 0
          ? "—"
          : gap > 0
            ? `+${gap} en BDD`
            : `${Math.abs(gap)} manquant`}
      </td>
    </tr>
  );
}
