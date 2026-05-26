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
import { loadCatalogSaisons } from "@/prisma/seed-data-loader";
import { ReseedCatalogForm } from "./ReseedCatalogForm";

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

  // Counts attendus depuis le code
  const { saisons: codeSaisons, source: catalogSource } = loadCatalogSaisons();
  const expectedSaisons = codeSaisons.length;
  const expectedEpisodes = codeSaisons.reduce(
    (n, s) => n + s.episodes.length,
    0,
  );
  const expectedBadges = ACHIEVEMENTS_CATALOG.length;
  const expectedItems = SHOP_CATALOG.length;

  const hasDrift =
    saisonsInDb !== expectedSaisons ||
    episodesInDb !== expectedEpisodes ||
    badgesInDb !== expectedBadges ||
    shopItemsInDb !== expectedItems;

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
      {hasDrift ? (
        <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-4">
          <p className="font-bold text-amber-900 dark:text-amber-200">
            ⚠️ Drift détecté entre le code et la BDD
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
            Les counts ci-dessous ne correspondent pas. Un re-import est probablement nécessaire.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 p-4">
          <p className="font-bold text-emerald-900 dark:text-emerald-200">
            ✅ BDD synchronisée avec le code
          </p>
          <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
            Aucun drift détecté. Re-importer reste safe (idempotent) mais pas nécessaire.
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700 text-left">
              <th className="py-2 font-semibold">Entité</th>
              <th className="py-2 font-semibold text-right">Dans le code</th>
              <th className="py-2 font-semibold text-right">En BDD</th>
              <th className="py-2 font-semibold text-right">Drift</th>
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
  const drift = code - db;
  return (
    <tr className="border-b border-gray-100 dark:border-slate-800 last:border-0">
      <td className="py-2">{label}</td>
      <td className="py-2 text-right tabular-nums">{code}</td>
      <td className="py-2 text-right tabular-nums">{db}</td>
      <td
        className={`py-2 text-right tabular-nums font-bold ${
          drift === 0
            ? "text-gray-400"
            : drift > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-red-600 dark:text-red-400"
        }`}
      >
        {drift === 0 ? "—" : drift > 0 ? `+${drift}` : drift}
      </td>
    </tr>
  );
}
