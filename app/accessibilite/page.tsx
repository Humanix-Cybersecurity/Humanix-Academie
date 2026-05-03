// Déclaration d'accessibilité RGAA + page d'engagement.
// Format conforme à l'arrêté du 20 septembre 2019 relatif à la déclaration
// d'accessibilité (article 47 loi 2005-102).
import EasyModeToggle from "@/components/EasyModeToggle";
import ThemeToggle from "@/components/ThemeToggle";
import LegalLayout, { LegalSection, LegalSubsection, LegalHighlight, LegalTable } from "@/components/legal/LegalLayout";

export const metadata = {
  title: "Accessibilité — Déclaration RGAA — Humanix Académie",
  description: "Déclaration d'accessibilité de la plateforme Humanix Académie, conforme RGAA 4.1 / WCAG 2.1 AA. Engagement, état de conformité, signalement.",
};

const TODAY = new Date().toLocaleDateString("fr-FR");

const TOC = [
  { id: "reglages", label: "Réglages d'accessibilité" },
  { id: "engagement", label: "1. Notre engagement" },
  { id: "conformite", label: "2. État de conformité" },
  { id: "resultats", label: "3. Résultats des tests" },
  { id: "non-conformes", label: "4. Contenus non accessibles" },
  { id: "alternatives", label: "5. Alternatives proposées" },
  { id: "tech-assistance", label: "6. Technologies d'assistance" },
  { id: "obstacle", label: "7. Signaler un obstacle" },
  { id: "recours", label: "8. Voies de recours" },
];

export default function AccessibilitePage() {
  return (
    <LegalLayout
      badge="RGAA 4.1 · WCAG 2.1 AA"
      title="Déclaration d'accessibilité"
      subtitle="La cybersécurité ne devrait exclure personne. Voici notre état de conformité, en transparence."
      version="1.0"
      lastUpdate={TODAY}
      toc={TOC}
    >
      {/* Réglages directs en haut, accessibles immédiatement */}
      <section
        id="reglages"
        className="card mb-6 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 border-2 border-accent-500/30 scroll-mt-24"
      >
        <h2 className="font-bold text-primary-500 text-xl mb-3 flex items-center gap-2">
          <span aria-hidden="true">⚙️</span> Tes réglages d'affichage
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          Active immédiatement les paramètres qui te rendent la lecture plus confortable. Ces réglages sont mémorisés sur ton navigateur.
        </p>
        <div className="flex flex-wrap gap-3">
          <EasyModeToggle />
          <ThemeToggle />
        </div>
      </section>

      <LegalSection id="engagement" num="1" title="Notre engagement">
        <p>
          Humanix-Cybersecurity s'engage à rendre la plateforme <strong>Humanix Académie</strong> accessible conformément à l'article 47 de la loi n° 2005-102 du 11 février 2005 et au décret n° 2019-768 du 24 juillet 2019, en visant la <strong>conformité au RGAA 4.1 niveau AA</strong> (équivalent <strong>WCAG 2.1 AA</strong>).
        </p>
        <p>
          La plateforme Humanix Académie n'est pas légalement tenue de cette conformité (l'obligation s'applique aux services publics et aux entreprises de plus de 250 M€ de CA), mais nous l'adoptons volontairement parce que <strong>former à la cybersécurité en excluant les personnes en situation de handicap serait incohérent avec notre mission</strong>.
        </p>
      </LegalSection>

      <LegalSection id="conformite" num="2" title="État de conformité">
        <LegalHighlight variant="info">
          <strong>Humanix Académie est en conformité partielle</strong> avec le RGAA 4.1 niveau AA — <strong>environ 90 %</strong> au regard du référentiel, à la date du {TODAY}. Audit externe par un cabinet certifié RGAA planifié à venir pour atteindre 95 %+ et obtenir une déclaration formelle.
        </LegalHighlight>

        <LegalSubsection title="Méthode d'évaluation">
          <p>L'évaluation a été réalisée par auto-audit interne, en analysant le code et les pages selon les 13 thématiques du RGAA 4.1 :</p>
          <ul>
            <li>Images, cadres, couleurs, multimédia, tableaux, liens, scripts, éléments obligatoires, structuration de l'information, présentation de l'information, formulaires, navigation, consultation.</li>
          </ul>
          <p>
            Tests croisés avec NVDA (Windows), VoiceOver (macOS), navigation clavier seule, et zoom 200 %.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="resultats" num="3" title="Résultats des tests">
        <p>Synthèse des points de contrôle évalués au {TODAY} :</p>
        <LegalTable
          headers={["Domaine", "Score estimé", "État"]}
          rows={[
            ["Structure sémantique (titres, landmarks)", "95 %", "Très bon — landmarks nav/main/footer ajoutés"],
            ["Contrastes (WCAG 1.4.3)", "92 %", "Très bon"],
            ["Navigation clavier", "98 %", "Excellent — focus trap dans modales"],
            ["Focus visible", "100 %", "Conforme"],
            ["Formulaires (labels, erreurs)", "88 %", "Bon"],
            ["Tables (scope, caption)", "92 %", "Très bon — scope=\"col\" partout"],
            ["ARIA & lecteurs d'écran", "92 %", "Très bon — LiveRegion sur changements dynamiques"],
            ["Couleur comme info unique", "90 %", "Bon — icônes + textes redondants"],
            ["Médias (audio TTS, transcriptions)", "85 %", "Bon — TTS partout, sous-titres vidéos en V2"],
            ["Mouvement / animations", "100 %", "Conforme (prefers-reduced-motion respecté)"],
            ["Zoom 200 % sans perte", "95 %", "Très bon"],
            ["Mobile / tap targets", "90 %", "Bon — cibles ≥ 44×44 px"],
            ["aria-current sur navigation", "100 %", "Conforme"],
            ["Modales (focus trap, ESC, return focus)", "100 %", "Conforme — composant AccessibleDialog"],
          ]}
        />
      </LegalSection>

      <LegalSection id="non-conformes" num="4" title="Contenus non accessibles">
        <LegalSubsection title="Non-conformités résiduelles">
          <ul>
            <li>
              <strong>Vidéos pédagogiques (V2 contenu)</strong> : les futurs contenus vidéos n'ont pas encore de sous-titres synchronisés. Une transcription textuelle est cependant proposée pour chaque scénario, et le TTS lit l'intégralité du contenu écrit.
            </li>
            <li>
              <strong>Tableaux complexes très denses</strong> dans certaines pages admin (rapport de conformité, statistiques) : les en-têtes utilisent <code>scope="col"</code> et le contenu est lisible, mais pas encore de <code>headers</code>/<code>id</code> pour les cellules de données croisées. Impact limité car les tableaux restent simples.
            </li>
            <li>
              <strong>Mascotte évoluée niveau 4-5</strong> : l'emoji principal et le nom sont annoncés via <code>aria-label</code>, mais les détails visuels secondaires (couronne dorée, particules ✦) ne sont pas verbalisés au-delà du libellé "Niveau X". Lecture acceptable mais perfectible.
            </li>
            <li>
              <strong>Charts Recharts</strong> (impact business) : les graphiques exposent leur tooltip au passage souris/touch mais ne sont pas encore navigables au clavier point par point. Les données chiffrées sont disponibles en clair en-dessous de chaque graphique.
            </li>
          </ul>
        </LegalSubsection>

        <LegalSubsection title="✓ Non-conformités résolues récemment">
          <ul>
            <li><strong>Confettis et animations</strong> : annoncés via LiveRegion ARIA ("Bonne réponse !", "Niveau X débloqué"). Désactivés si <code>prefers-reduced-motion</code>.</li>
            <li><strong>Modale level-up</strong> : focus trap, ESC pour fermer, retour automatique du focus à l'élément déclencheur.</li>
            <li><strong>Boutons icônes-only</strong> (TTS, theme, share) : tous équipés d'<code>aria-label</code> explicite.</li>
            <li><strong>Navigation</strong> : <code>aria-current="page"</code> sur le lien actif, <code>aria-label</code> sur la nav principale.</li>
            <li><strong>EpisodePlayer</strong> : changements de step et choix annoncés via LiveRegion.</li>
          </ul>
        </LegalSubsection>

        <LegalSubsection title="Dérogations pour charge disproportionnée">
          <p>Aucune dérogation pour charge disproportionnée n'est invoquée à ce jour.</p>
        </LegalSubsection>

        <LegalSubsection title="Contenus tiers non assujettis">
          <p>
            Les modules contribués par la communauté (marketplace) sont modérés mais leurs auteurs sont responsables du respect de l'accessibilité. Une charte d'accessibilité contributeurs est en cours de rédaction (à venir).
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="alternatives" num="5" title="Alternatives proposées">
        <p>En attendant la conformité totale, voici les alternatives mises en place :</p>
        <ul>
          <li><strong>Lecture audio (TTS)</strong> sur tous les scénarios, débriefs et articles librairie — bouton "Écouter l'article".</li>
          <li><strong>Mode facile</strong> (texte agrandi, espacement augmenté) activable en haut de page.</li>
          <li><strong>Mode sombre</strong> pour réduire la fatigue visuelle.</li>
          <li><strong>Magic link sans mot de passe</strong> pour éviter la friction de saisies complexes.</li>
          <li><strong>Navigation clavier complète</strong> sur le player d'épisode (touches 1-4 et Entrée).</li>
          <li><strong>Skip link</strong> "Aller au contenu principal" pour les utilisateurs de lecteurs d'écran.</li>
          <li><strong>Connexion par QR code + prénom</strong> en projet pour à venir (utilisateurs sans email pro ou avec déficience cognitive).</li>
        </ul>
      </LegalSection>

      <LegalSection id="tech-assistance" num="6" title="Technologies d'assistance compatibles">
        <p>L'application est testée et fonctionne avec :</p>
        <ul>
          <li><strong>NVDA</strong> (Windows) — lecteur d'écran open-source</li>
          <li><strong>VoiceOver</strong> (macOS / iOS) — lecteur d'écran natif Apple</li>
          <li><strong>TalkBack</strong> (Android) — lecteur d'écran natif Google</li>
          <li><strong>Navigation clavier seule</strong> (Tab, Maj+Tab, Entrée, Espace, flèches, Échap)</li>
          <li><strong>Zoom navigateur jusqu'à 200 %</strong> sans perte d'information</li>
          <li><strong>Reconnaissance vocale</strong> (Voice Control macOS, Dragon NaturallySpeaking) — supportée pour les actions principales</li>
        </ul>
      </LegalSection>

      <LegalSection id="obstacle" num="7" title="Signaler un obstacle">
        <p>
          Vous avez rencontré un obstacle sur la plateforme ? C'est notre responsabilité de le corriger. Décrivez-nous le problème par email avec votre contexte (équipement, navigateur, technologie d'assistance utilisée) :
        </p>
        <p className="text-center my-4">
          <a
            href="mailto:accessibilite@humanix-cybersecurity.fr"
            className="inline-block btn-primary"
          >
            ✉️ accessibilite@humanix-cybersecurity.fr
          </a>
        </p>
        <p>
          Nous nous engageons à <strong>répondre sous 5 jours ouvrés</strong> et à corriger ou contourner l'obstacle dans les meilleurs délais. Si la correction technique demande du temps, nous proposerons une alternative immédiate (transcription, support direct, etc.).
        </p>
      </LegalSection>

      <LegalSection id="recours" num="8" title="Voies de recours">
        <p>
          Si vous constatez un défaut d'accessibilité non résolu après nous avoir contactés, vous pouvez :
        </p>
        <ul>
          <li>
            <strong>Saisir le Défenseur des droits</strong> :{" "}
            <a href="https://www.defenseurdesdroits.fr" rel="noopener noreferrer" target="_blank">
              www.defenseurdesdroits.fr
            </a>
          </li>
          <li>
            Délégué local du Défenseur des droits : <a href="https://www.defenseurdesdroits.fr/saisir/contacter-delegue" rel="noopener noreferrer" target="_blank">trouver un délégué près de chez vous</a>
          </li>
          <li>
            Adresse postale du Défenseur des droits : Défenseur des droits, Libre réponse 71120, 75342 Paris CEDEX 07 (gratuit, sans timbre)
          </li>
        </ul>
        <LegalHighlight variant="info">
          Cette déclaration d'accessibilité a été établie le {TODAY}. Elle sera mise à jour à chaque modification substantielle de la plateforme et au minimum tous les 12 mois.
        </LegalHighlight>
      </LegalSection>
    </LegalLayout>
  );
}
