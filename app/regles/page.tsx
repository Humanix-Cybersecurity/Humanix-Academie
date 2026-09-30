// SPDX-License-Identifier: AGPL-3.0-or-later
// /regles : les regles de securite numerique de l'organisation, telles que
// chaque personne les lit, et son attestation de lecture.
//
// Pourquoi une page a part : la regle n'est pas un module qu'on termine,
// c'est un texte qu'on retrouve. Trois minutes, cinq regles, un bouton.
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, getSignInPath } from "@/lib/auth";
import { etatPourApprenant } from "@/lib/regles-organisation/etat";
import { dateLongue } from "@/lib/regles-organisation/deliberation";
import { reglesPour, VOCABULAIRE } from "@/lib/regles-organisation/regles";
import { attesterLectureAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Les règles de sécurité numérique - Humanix Académie",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, string> = {
  attestee: "Merci, ton attestation de lecture est enregistrée.",
  deja_attestee: "Tu avais déjà attesté la lecture de cette version.",
  non_adoptees:
    "Ces règles ne sont pas encore adoptées : l'attestation viendra après le vote.",
};

export default async function ReglesPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect(getSignInPath());
  const etat = await etatPourApprenant(
    session.user.tenantId as string,
    session.user.id as string,
  );
  const params = await searchParams;
  const v = VOCABULAIRE[etat.typeOrganisation];
  const regles = reglesPour(etat.typeOrganisation);
  const message = params.msg ? MESSAGES[params.msg] : null;

  return (
    <main id="main-content" className="animate-fadeIn">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <header>
          <p className="text-xs uppercase tracking-widest font-bold text-accent-600 dark:text-accent-300 mb-2">
            {etat.nomOrganisation || "Ton organisation"}
          </p>
          <h1 className="font-display text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
            Nos {regles.length === 5 ? "cinq" : regles.length} règles de
            sécurité numérique
          </h1>
          <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
            Elles ne demandent pas de juger si un appel est sincère ou si un
            mail est vrai : elles disent quoi faire. Et elles sont couvertes par{" "}
            {v.signataire} : refuser ou faire attendre en les appliquant
            n&apos;est jamais une faute.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            {etat.adoptee && etat.adopteeLe
              ? `Adoptées par ${v.organe} le ${dateLongue(etat.adopteeLe)}.`
              : `Proposées à l'adoption par ${v.organe}.`}
          </p>
        </header>

        {message && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100 px-4 py-3 text-sm"
          >
            {message}
          </p>
        )}

        <ol className="space-y-4">
          {regles.map((r, i) => (
            <li key={r.id} className="card flex gap-4">
              <span
                className="shrink-0 w-10 h-10 rounded-2xl bg-primary-50 dark:bg-slate-800 text-primary-500 dark:text-accent-300 font-extrabold grid place-items-center"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div>
                <h2 className="font-bold text-lg leading-snug">{r.titre}</h2>
                <p className="text-sm text-gray-700 dark:text-gray-200 mt-1 leading-relaxed">
                  {r.texte}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <section className="card" aria-labelledby="attestation-title">
          <h2 id="attestation-title" className="font-bold text-lg mb-2">
            Attestation de lecture
          </h2>
          {etat.lueLe ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Tu as attesté avoir lu ces règles le {dateLongue(etat.lueLe)}.
            </p>
          ) : etat.adoptee ? (
            <form action={attesterLectureAction} className="space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-200">
                En cliquant, tu confirmes avoir lu ces règles. Ce n&apos;est pas
                un examen : c&apos;est ce qui te couvre le jour où tu dis non.
              </p>
              <button type="submit" className="btn-primary">
                J&apos;ai lu les règles
              </button>
            </form>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              L&apos;attestation sera demandée une fois les règles adoptées par{" "}
              {v.organe}.
            </p>
          )}
        </section>

        <p className="text-sm">
          <Link
            href="/apprendre"
            className="underline text-primary-500 dark:text-accent-300"
          >
            ← Retour à mes modules
          </Link>
        </p>
      </div>
    </main>
  );
}
