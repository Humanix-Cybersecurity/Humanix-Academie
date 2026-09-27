// SPDX-License-Identifier: AGPL-3.0-or-later
// /admin/conformite-rgpd/note-information
//
// Deux modèles de note d'information à diffuser aux collaborateurs, pré-remplis
// avec le nom de l'organisation : l'un pour les exercices de simulation
// (phishing, smishing, vishing, quishing), l'autre pour la veille d'exposition.
//
// Pourquoi une page et pas un PDF : l'employeur doit adapter les passages entre
// crochets (référent, durée, date du CSE) avant diffusion. La page s'imprime
// telle quelle (Ctrl+P) ; tout ce qui n'est pas la note est masqué à
// l'impression.
//
// Cadre : Code du travail L1222-4 (information préalable des salariés sur tout
// dispositif collectant des informations les concernant) et L2312-38
// (information et consultation du CSE) ; RGPD art. 13 (information des
// personnes) ; CGV Humanix art. 9 (aucun usage disciplinaire). Le texte
// source, versionné, est docs/modeles/note-information-collaborateurs-simulations.md.
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import BoutonImprimer from "@/components/admin/conformite-rgpd/BoutonImprimer";

export const metadata = {
  title: "Note d'information aux collaborateurs - Humanix Académie",
};

function Champ({ children }: { children: string }) {
  return (
    <span className="rounded bg-amber-100 dark:bg-amber-900/40 px-1 font-semibold print:bg-transparent print:font-normal">
      [{children}]
    </span>
  );
}

export default async function NoteInformationPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }
  const tenant = await db.tenant.findUnique({
    where: { id: session.user.tenantId as string },
    select: { name: true },
  });
  const organisation = tenant?.name ?? "l'organisation";

  return (
    <div className="space-y-8">
      <div className="print:hidden">
        <AdminPageHeader
          icon="📄"
          title="Informer les collaborateurs"
          description="Deux notes à adapter puis à diffuser avant le premier exercice ou l'activation de la veille. Les passages entre crochets sont à compléter."
          actions={<BoutonImprimer libelle="Imprimer les deux notes" />}
        />
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Pourquoi c&apos;est obligatoire : un dispositif qui collecte des
          informations sur les salariés doit leur avoir été annoncé (Code du
          travail, art. L1222-4) et le CSE doit en être informé, ou consulté
          selon l&apos;ampleur (art. L2312-38). La note n&apos;annonce pas la
          date des exercices, seulement leur existence et leur cadre.
        </p>
      </div>

      <article className="card space-y-4 print:border-0 print:shadow-none">
        <h2 className="text-xl font-bold">
          Note d&apos;information : exercices de sensibilisation à la
          cybersécurité
        </h2>
        <p>
          <strong>{organisation}</strong> met en place, avec la plateforme
          Humanix Académie, un programme de sensibilisation à la cybersécurité.
          Il comprend des modules en ligne et des exercices de mise en situation
          : faux courriels (phishing), faux SMS (smishing), faux appels
          téléphoniques avec une voix de synthèse (vishing) et faux QR codes
          (quishing).
        </p>
        <h3 className="font-bold">Pourquoi</h3>
        <p>
          Les attaques qui visent les organisations passent d&apos;abord par les
          personnes. S&apos;entraîner sur des exemples réalistes, dans un cadre
          sans risque, est le moyen le plus efficace de reconnaître une
          tentative réelle.
        </p>
        <h3 className="font-bold">Ce que ces exercices sont</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>
            des mises en situation pédagogiques, annoncées par la présente note,
            qui peuvent survenir à tout moment sans avertissement individuel ;
          </li>
          <li>
            sans conséquence : cliquer, répondre, rappeler ou scanner conduit à
            une page qui explique les signaux à repérer, rien d&apos;autre ;
          </li>
          <li>
            des exercices qui n&apos;imitent jamais la voix d&apos;une personne
            réelle et n&apos;usurpent aucun numéro réel.
          </li>
        </ul>
        <h3 className="font-bold">Ce qu&apos;ils ne sont pas</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>
            un outil d&apos;évaluation professionnelle : les résultats ne sont
            jamais utilisés pour une sanction, une évaluation, une promotion ou
            une rémunération. C&apos;est un engagement de {organisation}, et une
            interdiction contractuelle de la plateforme ;
          </li>
          <li>
            une surveillance : aucun accès à vos messageries, à vos comptes ni à
            votre navigation.
          </li>
        </ul>
        <h3 className="font-bold">Données traitées</h3>
        <p>
          Nom, adresse professionnelle, service, modules suivis, résultats aux
          exercices et score de sensibilisation, recalculé sans historique
          individuel. <Champ>Référent : RSSI / DSI / responsable désigné</Champ>{" "}
          consulte ces résultats pour proposer les modules adaptés ; la
          direction ne reçoit que des chiffres agrégés par service. Base légale
          : intérêt légitime de l&apos;employeur à assurer la sécurité de son
          système d&apos;information (RGPD, art. 6.1.f). La plateforme Humanix
          Académie agit comme sous-traitant, avec un hébergement en France et
          aucun transfert hors de l&apos;Union européenne. Les données sont
          conservées pendant la relation de travail, puis anonymisées à
          l&apos;issue de la durée fixée par {organisation} :{" "}
          <Champ>12 mois</Champ>.
        </p>
        <h3 className="font-bold">Vos droits</h3>
        <p>
          Accès, rectification, effacement, limitation et opposition, en
          écrivant à <Champ>contact du référent données ou du DPO</Champ>. Vous
          pouvez aussi saisir la CNIL.
        </p>
        <h3 className="font-bold">Instances représentatives</h3>
        <p>
          Ce dispositif a fait l&apos;objet d&apos;une{" "}
          <Champ>information / consultation</Champ> du Comité Social et
          Économique le <Champ>date</Champ>.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Date d&apos;entrée en vigueur : <Champ>date</Champ>. Référent :{" "}
          <Champ>nom et fonction</Champ>.
        </p>
      </article>

      <article className="card space-y-4 print:border-0 print:shadow-none print:break-before-page">
        <h2 className="text-xl font-bold">
          Note d&apos;information : veille d&apos;exposition des comptes
          professionnels
        </h2>
        <p>
          Dans le cadre de sa démarche de sécurité informatique,{" "}
          <strong>{organisation}</strong> met en place une veille
          d&apos;exposition des comptes professionnels : un dispositif qui
          vérifie si des adresses professionnelles de l&apos;organisation
          apparaissent dans des fuites de données déjà rendues publiques.
        </p>
        <h3 className="font-bold">Ce que ce dispositif ne fait pas</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>il ne surveille ni votre activité, ni vos messages ;</li>
          <li>il n&apos;accède ni à vos comptes ni à vos mots de passe ;</li>
          <li>
            il ne sert à aucune fin disciplinaire ou d&apos;évaluation : être
            concerné par une fuite n&apos;est jamais de votre faute ;
          </li>
          <li>
            il ne traite pas vos adresses personnelles, seulement celles des
            domaines de l&apos;organisation ;
          </li>
          <li>
            il ne consulte que des fuites déjà publiques et ne stocke pas leur
            contenu, seulement la référence de la fuite.
          </li>
        </ul>
        <h3 className="font-bold">Données, finalité et destinataires</h3>
        <p>
          Adresse professionnelle, présence ou absence dans une fuite publique,
          statut de remédiation. Finalité : sécurité du système
          d&apos;information et formation ciblée. Base légale : intérêt légitime
          de l&apos;employeur (RGPD, art. 6.1.f). Destinataires :{" "}
          <Champ>RSSI et personnes habilitées</Champ>. Toute détection est
          vérifiée par une personne avant que vous soyez prévenu. Sous-traitant
          : Humanix Académie, hébergement en France, accord de traitement signé
          (RGPD, art. 28). Conservation : <Champ>12 mois</Champ>, puis
          suppression automatique.
        </p>
        <h3 className="font-bold">Vos droits et le CSE</h3>
        <p>
          Accès, rectification, effacement, limitation et opposition auprès de{" "}
          <Champ>contact du référent données ou du DPO</Champ> ; réclamation
          possible auprès de la CNIL. Ce dispositif a fait l&apos;objet
          d&apos;une <Champ>information / consultation</Champ> du CSE le{" "}
          <Champ>date</Champ>.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Date d&apos;entrée en vigueur : <Champ>date</Champ>. Référent :{" "}
          <Champ>nom et fonction</Champ>.
        </p>
      </article>

      <p className="text-xs text-gray-500 dark:text-gray-400 print:hidden">
        Ces modèles sont fournis pour aider votre mise en conformité ; ils ne
        remplacent pas la relecture de votre DPO ou de votre conseil. Le
        parcours complet est sur{" "}
        <Link href="/admin/conformite-rgpd" className="underline">
          Mise en conformité RGPD
        </Link>
        .
      </p>
    </div>
  );
}
