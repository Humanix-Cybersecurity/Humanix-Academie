// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique de doc SCIM v2.
// Cible : DSI / IAM admin qui configure le provisioning automatique.
// A11y RGAA AA + UI/UX différenciante (onglets fournisseurs, code samples,
// tableau de mapping attributs).

import Link from "next/link";

export const metadata = {
  title: "SCIM v2 - Auto-provisioning utilisateurs · Humanix Académie",
  description:
    "Provisioning automatique des utilisateurs depuis Microsoft Entra ID, Okta, Google Workspace, Keycloak via le standard SCIM v2 (RFC 7643/7644).",
};

export default function ScimDocPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Intégration · Provisioning
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          SCIM v2 -{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            zéro création manuelle
          </span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Vos utilisateurs Entra / Okta / Google / Keycloak sont créés,
          synchronisés et désactivés automatiquement dans Humanix dès qu'ils
          changent de statut dans votre annuaire. Standard ouvert, RFC
          7643/7644.
        </p>
      </header>

      {/* Endpoint */}
      <section
        aria-labelledby="endpoint-title"
        className="card mb-10 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700"
      >
        <h2
          id="endpoint-title"
          className="text-xl font-extrabold text-primary-500 mb-3"
        >
          Endpoint à configurer
        </h2>
        <pre className="bg-slate-900 dark:bg-black text-slate-100 p-4 rounded-xl text-sm overflow-x-auto">
          <code>https://humanix-academie.fr/scim/v2/</code>
        </pre>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
          <strong>Authentification</strong> : OAuth Bearer Token. Utilisez une{" "}
          <Link href="/admin/api-keys" className="font-bold underline">
            clé API tenant
          </Link>{" "}
          générée depuis votre console admin Humanix.
        </p>
      </section>

      {/* Mode d'emploi par fournisseur */}
      <section aria-labelledby="providers-title" className="mb-10">
        <h2
          id="providers-title"
          className="text-2xl font-extrabold text-primary-500 mb-4"
        >
          Configuration par fournisseur
        </h2>

        <div className="space-y-4">
          <details className="card" open>
            <summary className="cursor-pointer font-bold text-primary-500 text-lg">
              <span aria-hidden="true">🔷 </span>Microsoft Entra ID (ex Azure
              AD)
            </summary>
            <ol className="mt-3 space-y-2 text-sm list-decimal list-inside">
              <li>
                Centre d'administration Entra →{" "}
                <strong>Applications d'entreprise</strong> →{" "}
                <strong>Nouvelle application</strong> →{" "}
                <strong>Application non-galerie</strong> → nommez-la "Humanix
                Académie".
              </li>
              <li>
                Onglet <strong>Provisionnement</strong> →{" "}
                <strong>Mise en route</strong> → Mode ={" "}
                <strong>Automatique</strong>.
              </li>
              <li>
                <strong>
                  Informations d'identification de l'administrateur
                </strong>{" "}
                :
                <ul className="list-disc list-inside ml-5 mt-1">
                  <li>
                    URL du locataire :{" "}
                    <code>
                      https://humanix-academie.fr/scim/v2
                    </code>
                  </li>
                  <li>
                    Jeton secret : <code>hxa_VOTRE_CLE_API</code>
                  </li>
                </ul>
              </li>
              <li>
                <strong>Tester la connexion</strong> → doit retourner «
                Connexion réussie ».
              </li>
              <li>
                Onglet <strong>Mappings</strong> → activez « Provisionner les
                utilisateurs Microsoft Entra ID ».
              </li>
              <li>
                Affectez les utilisateurs à provisionner, puis{" "}
                <strong>activez le provisionnement</strong>.
              </li>
            </ol>
          </details>

          <details className="card">
            <summary className="cursor-pointer font-bold text-primary-500 text-lg">
              <span aria-hidden="true">🟦 </span>Okta
            </summary>
            <ol className="mt-3 space-y-2 text-sm list-decimal list-inside">
              <li>
                Admin Okta → <strong>Applications</strong> →{" "}
                <strong>Browse App Catalog</strong> → recherchez "SCIM 2.0 Test
                App (Header Auth)" comme template, ou créez une app SAML avec
                extension SCIM.
              </li>
              <li>
                Onglet <strong>Provisioning</strong> →{" "}
                <strong>Configure API Integration</strong> → cochez{" "}
                <em>Enable API Integration</em>.
                <ul className="list-disc list-inside ml-5 mt-1">
                  <li>
                    Base URL :{" "}
                    <code>
                      https://humanix-academie.fr/scim/v2
                    </code>
                  </li>
                  <li>
                    API Token : <code>hxa_VOTRE_CLE_API</code>
                  </li>
                </ul>
              </li>
              <li>
                <strong>Test API Credentials</strong> → vert.
              </li>
              <li>
                Onglet <strong>To App</strong> → activez Create / Update /
                Deactivate Users.
              </li>
            </ol>
          </details>

          <details className="card">
            <summary className="cursor-pointer font-bold text-primary-500 text-lg">
              <span aria-hidden="true">🟢 </span>Google Workspace
            </summary>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Google Workspace ne propose pas de SCIM out-of-the-box, mais vous
              pouvez utiliser <strong>Google Cloud Identity Premium</strong>{" "}
              (provisioning natif via SAML) ou un connecteur tiers comme{" "}
              <strong>Rippling</strong>, <strong>Lucca</strong> ou{" "}
              <strong>Workato</strong>. Notre SCIM v2 standard est compatible.
              Documentation :{" "}
              <a
                href="https://support.google.com/cloudidentity/answer/6328701"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                Google Cloud Identity SCIM ↗
              </a>
            </p>
          </details>

          <details className="card">
            <summary className="cursor-pointer font-bold text-primary-500 text-lg">
              <span aria-hidden="true">🔓 </span>Keycloak (open-source)
            </summary>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Keycloak ne propose pas de SCIM client natif. Utilisez un
              middleware open-source comme{" "}
              <a
                href="https://github.com/Captain-P-Goldfish/scim-for-keycloak"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                scim-for-keycloak ↗
              </a>{" "}
              ou un déclencheur custom sur les events Keycloak.
            </p>
          </details>
        </div>
      </section>

      {/* Mapping attributs */}
      <section aria-labelledby="mapping-title" className="mb-10">
        <h2
          id="mapping-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Mapping des attributs
        </h2>
        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Mapping entre les attributs SCIM standards et les champs Humanix
            </caption>
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 text-left">
                <th scope="col" className="p-3 font-bold">
                  Attribut SCIM
                </th>
                <th scope="col" className="p-3 font-bold">
                  Champ Humanix
                </th>
                <th scope="col" className="p-3 font-bold">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              <Row
                scim="userName"
                humanix="email"
                notes="Identifiant principal, unique par tenant"
              />
              <Row
                scim="emails[primary=true].value"
                humanix="email"
                notes="Si différent de userName, c'est cette valeur qui prime"
              />
              <Row
                scim="displayName"
                humanix="name"
                notes="Sinon name.formatted ou givenName + familyName"
              />
              <Row
                scim="active"
                humanix="isActive"
                notes="false = soft-delete (historique conservé)"
              />
              <Row
                scim={"urn:humanix:scim:schemas:extension:User:1.0:role"}
                humanix="role"
                notes="LEARNER (defaut) | MANAGER | ADMIN | SUPERADMIN"
              />
              <Row
                scim={"urn:humanix:scim:schemas:extension:User:1.0:service"}
                humanix="service"
                notes="Libre (Compta, Direction, IT…) - mappe sur Group SCIM"
              />
              <Row
                scim="meta.created / meta.lastModified"
                humanix="createdAt / updatedAt"
                notes="Lecture seule"
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* Endpoints disponibles */}
      <section aria-labelledby="endpoints-title" className="mb-10">
        <h2
          id="endpoints-title"
          className="text-2xl font-extrabold text-primary-500 mb-3"
        >
          Endpoints disponibles
        </h2>
        <ul className="space-y-2 text-sm font-mono">
          <li>
            <span className="inline-block w-16 font-bold text-green-600 dark:text-green-400">
              GET
            </span>
            <code>/scim/v2/ServiceProviderConfig</code>
          </li>
          <li>
            <span className="inline-block w-16 font-bold text-green-600 dark:text-green-400">
              GET
            </span>
            <code>/scim/v2/ResourceTypes</code>
          </li>
          <li>
            <span className="inline-block w-16 font-bold text-green-600 dark:text-green-400">
              GET
            </span>
            <code>/scim/v2/Users</code>
            <span className="text-xs text-gray-500 ml-2">
              (filter, startIndex, count)
            </span>
          </li>
          <li>
            <span className="inline-block w-16 font-bold text-blue-600 dark:text-blue-400">
              POST
            </span>
            <code>/scim/v2/Users</code>
          </li>
          <li>
            <span className="inline-block w-16 font-bold text-green-600 dark:text-green-400">
              GET
            </span>
            <code>/scim/v2/Users/{"{id}"}</code>
          </li>
          <li>
            <span className="inline-block w-16 font-bold text-amber-600 dark:text-amber-400">
              PUT
            </span>
            <code>/scim/v2/Users/{"{id}"}</code>
          </li>
          <li>
            <span className="inline-block w-16 font-bold text-amber-600 dark:text-amber-400">
              PATCH
            </span>
            <code>/scim/v2/Users/{"{id}"}</code>
          </li>
          <li>
            <span className="inline-block w-16 font-bold text-red-600 dark:text-red-400">
              DELETE
            </span>
            <code>/scim/v2/Users/{"{id}"}</code>
            <span className="text-xs text-gray-500 ml-2">
              (soft-delete par defaut, ?hard=true pour RGPD)
            </span>
          </li>
          <li>
            <span className="inline-block w-16 font-bold text-green-600 dark:text-green-400">
              GET
            </span>
            <code>/scim/v2/Groups</code>
            <span className="text-xs text-gray-500 ml-2">
              (mappés sur User.service)
            </span>
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section className="card text-center bg-gradient-to-br from-primary-500 to-accent-500 text-white">
        <h2 className="text-2xl font-extrabold mb-2">Prêt à automatiser ?</h2>
        <p className="opacity-90 mb-5">
          Compatible avec tous les IdP qui parlent SCIM v2 standard. RFC 7643
          (schema) + RFC 7644 (protocol).
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/admin/api-keys"
            className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
          >
            Générer ma clé API
          </Link>
          <Link
            href="/integrations"
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-2xl transition border-2 border-white/30"
          >
            Voir tous les connecteurs
          </Link>
        </div>
      </section>
    </div>
  );
}

function Row({
  scim,
  humanix,
  notes,
}: {
  scim: string;
  humanix: string;
  notes: string;
}) {
  return (
    <tr className="border-t border-gray-100 dark:border-slate-700">
      <td className="p-3 font-mono text-xs">{scim}</td>
      <td className="p-3 font-mono text-xs text-accent-500">{humanix}</td>
      <td className="p-3 text-gray-600 dark:text-gray-300 text-xs">{notes}</td>
    </tr>
  );
}
