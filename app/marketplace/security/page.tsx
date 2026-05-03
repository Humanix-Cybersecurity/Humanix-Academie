// Page publique : politique de securite et de contenu de la marketplace
import Link from "next/link";

export default function MarketplaceSecurityPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-fadeIn">
      <Link href="/marketplace" className="text-sm text-gray-500 hover:text-primary-500 mb-4 inline-block">
        ← Retour au catalogue
      </Link>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-500 mb-2">
        🛡️ Marketplace — Sécurité et politique de contenu
      </h1>
      <p className="text-gray-600 mb-8 italic">
        Sur la cybersécurité, le moindre laxisme tue la crédibilité. Voici nos garde-fous.
      </p>

      <Section title="🎯 Nos 7 principes">
        <ol className="list-decimal pl-6 space-y-2 text-sm">
          <li><strong>Zéro code exécutable côté communauté.</strong> Aucun HTML, JS, MDX ou URL externe — uniquement du texte structuré.</li>
          <li><strong>Modération humaine obligatoire.</strong> Aucun module ne devient public sans validation explicite par un SUPERADMIN Humanix.</li>
          <li><strong>Intégrité cryptographique.</strong> Chaque module publié est signé par un hash SHA-256 calculé sur son payload normalisé.</li>
          <li><strong>Audit trail complet.</strong> Soumission, modération, installation, désinstallation : chaque action journalisée.</li>
          <li><strong>Isolation multi-tenant stricte.</strong> Un module installé dans une organisation ne fuite jamais vers une autre.</li>
          <li><strong>Permissions verrouillées.</strong> Soumettre = ADMIN/SUPERADMIN. Modérer = SUPERADMIN seul.</li>
          <li><strong>Désinstallation non destructive.</strong> Les progressions des apprenants sont conservées (preuve de formation).</li>
        </ol>
      </Section>

      <Section title="🛡️ Garde-fous techniques">
        <p className="text-sm leading-relaxed mb-3">
          Le payload de chaque module est validé par un schéma <strong>Zod strict</strong> côté serveur :
        </p>
        <ul className="text-sm list-disc pl-6 space-y-1">
          <li>Tous les champs ont des longueurs min/max</li>
          <li>Aucune balise HTML ou caractère d'échappement n'est autorisée dans les zones texte sensibles</li>
          <li>Les enums (catégorie, difficulté, licence) sont contraints à des valeurs autorisées</li>
          <li>Le nombre d'épisodes / choix / quiz est limité (1-10 / 2-4 / 1-5)</li>
          <li>Les IDs des choix doivent être uniques et formatés</li>
          <li>Au moins une option doit avoir l'issue "good" pour permettre la pédagogie</li>
        </ul>
        <p className="text-sm mt-3">
          Toute violation entraîne un refus immédiat avec liste détaillée des erreurs renvoyée à l'auteur.
        </p>
      </Section>

      <Section title="🔐 Hash d'intégrité SHA-256">
        <p className="text-sm leading-relaxed">
          À chaque sauvegarde, le serveur calcule un hash déterministe du payload (JSON canonique avec clés triées).
          Au moment de l'approbation, le modérateur recompute le hash et <strong>rejette automatiquement</strong> s'il a changé entre soumission et modération.
          Garantit qu'on ne peut pas approuver une version puis muter le contenu silencieusement.
        </p>
      </Section>

      <Section title="📜 Politique de contenu — Critères d'approbation">
        <p className="text-sm mb-2">Un module est approuvé s'il respecte :</p>
        <ul className="text-sm list-disc pl-6 space-y-1">
          <li><strong>Exactitude technique cyber</strong> — pas d'information erronée ou dangereuse</li>
          <li><strong>Pédagogie claire</strong> — scénario crédible, choix non triviaux, débrief de valeur</li>
          <li><strong>Pas de marketing déguisé</strong> — aucune promotion produit / marque commerciale</li>
          <li><strong>Pas de contenu discriminatoire</strong> ou caricatural</li>
          <li><strong>Originalité</strong> — contenu original ou cité avec source</li>
          <li><strong>Format respecté</strong> — longueurs, langue française, pas de hors-sujet</li>
        </ul>
      </Section>

      <Section title="⚖️ Propriété intellectuelle et licences">
        <ul className="text-sm list-disc pl-6 space-y-1">
          <li>L'auteur <strong>conserve la propriété</strong> de son module</li>
          <li>Il accorde une licence <strong>CC-BY</strong> ou <strong>CC-BY-SA</strong> au moment de la soumission</li>
          <li>Les modules officiels Humanix sont sous licence <strong>propriétaire</strong></li>
          <li>Humanix modère mais <strong>ne devient pas propriétaire</strong> du contenu communauté</li>
        </ul>
      </Section>

      <Section title="🚨 Signaler un problème">
        <p className="text-sm leading-relaxed">
          Vous trouvez un module problématique ?
          Vous suspectez une vulnérabilité ?
          → contactez votre SUPERADMIN Humanix, ou écrivez à <code>security@humanix-cybersecurity.fr</code>.
          Programme bug bounty : V2.
        </p>
      </Section>

      <div className="mt-8 text-center text-sm text-gray-500 italic">
        Document complet :{" "}
        <a
          href="https://github.com/humanix/academy/blob/main/MARKETPLACE_SECURITY.md"
          className="text-accent-500 underline"
        >
          MARKETPLACE_SECURITY.md
        </a>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card mb-5">
      <h2 className="text-xl font-bold text-primary-500 mb-3">{title}</h2>
      {children}
    </section>
  );
}
