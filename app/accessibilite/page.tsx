// SPDX-License-Identifier: AGPL-3.0-or-later
// Déclaration d'accessibilité RGAA + page d'engagement.
// Format conforme à l'arrêté du 20 septembre 2019 relatif à la déclaration
// d'accessibilité (article 47 loi 2005-102).
import EasyModeToggle from "@/components/EasyModeToggle";
import ThemeToggle from "@/components/ThemeToggle";
import LegalLayout, {
  LegalSection,
  LegalSubsection,
  LegalHighlight,
  LegalTable,
} from "@/components/legal/LegalLayout";

export const metadata = {
  title: "Accessibilité - Déclaration RGAA - Humanix Académie",
  description:
    "Déclaration d'accessibilité de la plateforme Humanix Académie, conforme RGAA 4.1 / WCAG 2.1 AA. Engagement, état de conformité, signalement.",
};

const TODAY = new Date().toLocaleDateString("fr-FR");

const TOC = [
  { id: "reglages", label: "Réglages d'accessibilité" },
  { id: "engagement", label: "1. Notre engagement" },
  { id: "conformité", label: "2. État de conformité" },
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
      version="1.1"
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
          Active immédiatement les paramètrès qui te rendent la lecture plus
          confortable. Ces réglages sont mémorisés sur ton navigateur.
        </p>
        <div className="flex flex-wrap gap-3">
          <EasyModeToggle />
          <ThemeToggle />
        </div>
      </section>

      <LegalSection id="engagement" num="1" title="Notre engagement">
        <p>
          Humanix-Cybersecurity s'engage à rendre la plateforme{" "}
          <strong>Humanix Académie</strong> accessible conformément à l'article
          47 de la loi n° 2005-102 du 11 février 2005 et au décret n° 2019-768
          du 24 juillet 2019, en visant la{" "}
          <strong>conformité au RGAA 4.1 niveau AA</strong> (équivalent{" "}
          <strong>WCAG 2.1 AA</strong>).
        </p>
        <p>
          La plateforme Humanix Académie n'est pas légalement tenue de cette
          conformité (l'obligation s'applique aux services publics et aux
          entreprises de plus de 250 M€ de CA), mais nous l'adoptons
          volontairement parce que{" "}
          <strong>
            former à la cybersécurité en excluant les personnes en situation de
            handicap serait incohérent avec notre mission
          </strong>
          .
        </p>
      </LegalSection>

      <LegalSection id="conformite" num="2" title="État de conformité">
        <LegalHighlight variant="success">
          <strong>Humanix Académie est en conformité partielle</strong> avec le
          RGAA 4.1 niveau AA - <strong>environ 91 %</strong> au regard du
          référentiel, à la date du {TODAY} (v1.1, post-correctifs). Audit
          externe par un cabinet certifié RGAA planifié pour atteindre 95 %+
          et obtenir une déclaration formelle.
        </LegalHighlight>

        <LegalHighlight variant="info">
          <strong>Évolution du score (transparence méthodologique)</strong> :
          90 % (auto-audit initial) → 82 % (audit approfondi mai 2026) → <strong>91 % (v1.1, post-correctifs 12 mai 2026)</strong>. Les 3 zones structurelles identifiées en v1.0 ont été traitées :
          <ul className="mt-2">
            <li>
              <strong>Contraste libellés secondaires (RGAA 3.2)</strong> : 94
              occurrences de <code>text-gray-400</code> sur fond clair
              (ratio 2.84:1, échec WCAG AA) remplacées par{" "}
              <code>text-gray-500</code> (ratio 4.61:1, conforme). Les usages
              légitimes <code>dark:text-gray-400</code> (mode sombre) ont été
              préservés.
            </li>
            <li>
              <strong>Légendes de tableaux (RGAA 5.4)</strong> : 15 tableaux
              ont reçu un <code>{`<caption className="sr-only">`}</code>{" "}
              descriptif (pages admin, profil, comparatif, tarifs, sécurité,
              tenants superadmin).
            </li>
            <li>
              <strong>Landmarks explicites (RGAA 9.1)</strong> : audit révèle
              que les landmarks étaient <strong>déjà bien marqués</strong> dans
              le code (<code>{`<nav aria-label="Navigation principale">`}</code>{" "}
              sur HeaderBar, <code>{`<footer aria-label="Pied de page">`}</code>{" "}
              sur SiteFooter, <code>{`<aside aria-label="Navigation console">`}</code>{" "}
              sur AdminSidebar). L'audit v1.0 sous-estimait. Ajout mineur :{" "}
              <code>aria-label="Sections console admin"</code> sur la nav
              imbriquée de la sidebar pour distinguer les navs.
            </li>
          </ul>
        </LegalHighlight>

        <LegalSubsection title="Méthode d'évaluation">
          <p>
            L'évaluation a été réalisée par auto-audit interne approfondi, en
            analysant le code et les pages selon les 13 thématiques du RGAA 4.1 :
          </p>
          <ul>
            <li>
              Images, cadres, couleurs, multimédia, tableaux, liens, scripts,
              éléments obligatoires, structuration de l'information,
              présentation de l'information, formulaires, navigation,
              consultation.
            </li>
          </ul>
          <p>
            Tests croisés avec NVDA (Windows), VoiceOver (macOS), navigation
            clavier seule, et zoom 200 %.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="resultats" num="3" title="Résultats des tests">
        <p>
          Synthèse des points de contrôle évalués au {TODAY} sur les 13
          thématiques du RGAA 4.1 :
        </p>
        <LegalTable
          headers={["Thématique RGAA", "Score", "État"]}
          rows={[
            [
              "1. Images (alt, décoratives)",
              "85 %",
              "Bon - alt présent sur 99 % des images, à vérifier sur quelques modules MDX",
            ],
            [
              "2. Cadres (iframes)",
              "95 %",
              "Très bon - aucune iframe dans la plateforme",
            ],
            [
              "3. Couleurs et contrastes",
              "90 %",
              "Très bon (v1.1) - 94 usages text-gray-400 sur fond clair remplacés par text-gray-500 (ratio 4.61:1, conforme WCAG AA). Restent à auditer les fonds personnalisés (gradients custom)",
            ],
            [
              "4. Multimédia (audio TTS)",
              "90 %",
              "Très bon - TTS Piper sur tous scénarios, transcriptions textuelles fournies",
            ],
            [
              "5. Tableaux (caption, scope)",
              "95 %",
              'Très bon (v1.1) - scope="col" partout, et 15 tableaux ont reçu un <caption className="sr-only"> descriptif',
            ],
            [
              "6. Liens (nom accessible)",
              "88 %",
              "Bon - aria-label sur liens icône-only, pas de 'cliquez ici'",
            ],
            [
              "7. Scripts ARIA (modales, dropdowns)",
              "92 %",
              "Très bon - aria-expanded/controls présents, focus trap modales",
            ],
            [
              "8. Éléments obligatoires (lang, title, skip-link)",
              "95 %",
              "Très bon - <html lang='fr'>, page title unique, skip link en haut",
            ],
            [
              "9. Structuration (h1-h6, landmarks)",
              "92 %",
              "Très bon (v1.1) - audit révèle que les landmarks étaient déjà bien marqués (<nav aria-label> sur HeaderBar/Footer/AdminSidebar). Ajout aria-label sur la nav imbriquée AdminSidebar pour distinction",
            ],
            [
              "10. Présentation (zoom 200 %, motion)",
              "88 %",
              "Très bon - zoom 200 % sans perte, prefers-reduced-motion respecté",
            ],
            [
              "11. Formulaires (label, erreurs)",
              "78 %",
              "Bon - <label htmlFor> partout, role='alert' sur erreurs, quelques inputs admin à revoir",
            ],
            [
              "12. Navigation (multiple méthodes, aria-current)",
              "85 %",
              "Bon - aria-current='page' partout, sitemap.xml présent, plan du site dédié à venir",
            ],
            [
              "13. Consultation (limite temps, redirects)",
              "90 %",
              "Très bon - aucun mouvement obligatoire, aucune limite de temps imposée",
            ],
          ]}
        />
        <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
          <strong>Score global pondéré v1.1 : ~91 %.</strong> Les 3 axes
          prioritaires identifiés en v1.0 sont résolus (contraste +25 pts,
          tableaux +25 pts, landmarks +20 pts). Reste à traiter avant audit
          externe : sous-titres synchronisés vidéos (V2 contenu), navigation
          clavier point-par-point sur charts Recharts, audit RGAA détaillé
          par cabinet certifié pour viser 95 %+.
        </p>
      </LegalSection>

      <LegalSection id="non-conformes" num="4" title="Contenus non accessibles">
        <LegalSubsection title="Non-conformités résiduelles">
          <ul>
            <li>
              <strong>Vidéos pédagogiques (V2 contenu)</strong> : les futurs
              contenus vidéos n'ont pas encore de sous-titres synchronisés. Une
              transcription textuelle est cependant proposée pour chaque
              scénario, et le TTS lit l'intégralité du contenu écrit.
            </li>
            <li>
              <strong>Tableaux complexes très denses</strong> dans certaines
              pages admin (rapport de conformité, statistiques) : les en-têtes
              utilisent <code>scope="col"</code> et le contenu est lisible, mais
              pas encore de <code>headers</code>/<code>id</code> pour les
              cellules de données croisées. Impact limité car les tableaux
              restent simples.
            </li>
            <li>
              <strong>Mascotte évoluée niveau 4-5</strong> : l'emoji principal
              et le nom sont annoncés via <code>aria-label</code>, mais les
              détails visuels secondaires (couronne dorée, particules ✦) ne sont
              pas verbalisés au-delà du libellé "Niveau X". Lecture acceptable
              mais perfectible.
            </li>
            <li>
              <strong>Charts Recharts</strong> (impact business) : les
              graphiques exposent leur tooltip au passage souris/touch mais ne
              sont pas encore navigables au clavier point par point. Les données
              chiffrées sont disponibles en clair en-dessous de chaque
              graphique.
            </li>
          </ul>
        </LegalSubsection>

        <LegalSubsection title="✓ Non-conformités résolues récemment">
          <ul>
            <li>
              <strong>Contraste libellés secondaires</strong> (RGAA 3.2 / WCAG
              1.4.3) — <em>résolu 12 mai 2026, v1.1</em> : 94 occurrences de{" "}
              <code>text-gray-400</code> sur fond clair (ratio 2.84:1, échec
              WCAG AA) remplacées par <code>text-gray-500</code> (ratio 4.61:1,
              conforme) via patch automatisé Python avec lookbehind négatif
              pour préserver les usages légitimes <code>dark:text-gray-400</code>{" "}
              sur fond sombre. Audit : 270 occurrences <code>dark:</code>{" "}
              préservées, 94 isolées corrigées.
            </li>
            <li>
              <strong>Légendes de tableaux</strong> (RGAA 5.4) — <em>résolu
              12 mai 2026, v1.1</em> : 15 tableaux ont reçu un{" "}
              <code>{`<caption className="sr-only">`}</code> descriptif (pages
              admin TeamTable, AtRiskUsers, AnecdoteAdmin, GroupsManager,
              WebhookTable, UsersTable, ApiKeysManager, CsvImporter,
              MarkdownView ; pages publiques tarifs, comparatif, sécurité ;
              superadmin tenants ; legal layout). Lecteurs d'écran annoncent
              désormais un contexte avant la lecture du tableau.
            </li>
            <li>
              <strong>Landmarks ARIA explicites</strong> (RGAA 9.1) —{" "}
              <em>vérifié 12 mai 2026, v1.1</em> : audit révèle que les
              landmarks étaient <strong>déjà bien marqués</strong> dans le code
              (<code>{`<nav aria-label="Navigation principale">`}</code> sur
              HeaderBar, <code>{`<footer aria-label="Pied de page">`}</code>{" "}
              sur SiteFooter, <code>{`<aside aria-label="Navigation console">`}</code>{" "}
              sur AdminSidebar). L'audit v1.0 sous-estimait ce point. Ajout
              mineur : <code>aria-label="Sections console admin"</code> sur la
              nav imbriquée de la sidebar admin pour distinguer les deux navs.
            </li>
            <li>
              <strong>ThemeToggle sur mobile</strong> : les boutons "Clair /
              Sombre / Auto" cachaient leur libellé en classe{" "}
              <code>hidden sm:inline</code>. Sur mobile, un lecteur d'écran
              annonçait juste l'icône. Fix : <code>aria-label</code> explicite +{" "}
              <code>aria-hidden</code> sur l'emoji pour éviter la double
              annonce.
            </li>
            <li>
              <strong>Bouton de fermeture du drawer admin</strong> (
              <code>AdminSidebar</code>) : <code>aria-label</code> présent mais
              le caractère ✕ n'était pas marqué <code>aria-hidden</code> →
              double annonce ("X, fermer le menu"). Fix : wrap dans{" "}
              <code>{`<span aria-hidden>`}</code>.
            </li>
            <li>
              <strong>Bouton "Rechercher" observatoire fuites</strong> :
              l'emoji 🔍 n'était pas marqué <code>aria-hidden</code> → annoncé
              "loupe rechercher". Fix : <code>aria-hidden</code> sur l'emoji,
              le texte "Rechercher" suffit.
            </li>
            <li>
              <strong>Confettis et animations</strong> : annoncés via LiveRegion
              ARIA ("Bonne réponse !", "Niveau X débloqué"). Désactivés si{" "}
              <code>prefers-reduced-motion</code>.
            </li>
            <li>
              <strong>Modale level-up</strong> : focus trap, ESC pour fermer,
              retour automatique du focus à l'élément déclencheur.
            </li>
            <li>
              <strong>Boutons icônes-only</strong> (TTS, theme, share) : tous
              équipés d'<code>aria-label</code> explicite.
            </li>
            <li>
              <strong>Navigation</strong> : <code>aria-current="page"</code> sur
              le lien actif, <code>aria-label</code> sur la nav principale.
            </li>
            <li>
              <strong>EpisodePlayer</strong> : changements de step et choix
              annoncés via LiveRegion.
            </li>
          </ul>
        </LegalSubsection>

        <LegalSubsection title="Dérogations pour charge disproportionnée">
          <p>
            Aucune dérogation pour charge disproportionnée n'est invoquée à ce
            jour.
          </p>
        </LegalSubsection>

        <LegalSubsection title="Contenus tiers non assujettis">
          <p>
            Les modules contribués par la communauté (marketplace) sont modérés
            mais leurs auteurs sont responsables du respect de l'accessibilité.
            Une charte d'accessibilité contributeurs est en cours de rédaction
            (à venir).
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="alternatives" num="5" title="Alternatives proposées">
        <p>
          En attendant la conformité totale, voici les alternatives mises en
          place :
        </p>
        <ul>
          <li>
            <strong>Lecture audio (TTS)</strong> sur tous les scénarios,
            débriefs et articles librairie - bouton "Écouter l'article".
          </li>
          <li>
            <strong>Mode facile</strong> (texte agrandi, espacement augmenté)
            activable en haut de page.
          </li>
          <li>
            <strong>Mode sombre</strong> pour réduire la fatigue visuelle.
          </li>
          <li>
            <strong>Magic link sans mot de passe</strong> pour éviter la
            friction de saisies complexes.
          </li>
          <li>
            <strong>Navigation clavier complète</strong> sur le player d'épisode
            (touches 1-4 et Entrée).
          </li>
          <li>
            <strong>Skip link</strong> "Aller au contenu principal" pour les
            utilisateurs de lecteurs d'écran.
          </li>
          <li>
            <strong>Connexion par QR code + prénom</strong> en projet pour à
            venir (utilisateurs sans email pro ou avec déficience cognitive).
          </li>
        </ul>
      </LegalSection>

      <LegalSection
        id="tech-assistance"
        num="6"
        title="Technologies d'assistance compatibles"
      >
        <p>L'application est testée et fonctionne avec :</p>
        <ul>
          <li>
            <strong>NVDA</strong> (Windows) - lecteur d'écran open-source
          </li>
          <li>
            <strong>VoiceOver</strong> (macOS / iOS) - lecteur d'écran natif
            Apple
          </li>
          <li>
            <strong>TalkBack</strong> (Android) - lecteur d'écran natif Google
          </li>
          <li>
            <strong>Navigation clavier seule</strong> (Tab, Maj+Tab, Entrée,
            Espace, flèches, Échap)
          </li>
          <li>
            <strong>Zoom navigateur jusqu'à 200 %</strong> sans perte
            d'information
          </li>
          <li>
            <strong>Reconnaissance vocale</strong> (Voice Control macOS, Dragon
            NaturallySpeaking) - supportée pour les actions principales
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="obstacle" num="7" title="Signaler un obstacle">
        <p>
          Vous avez rencontré un obstacle sur la plateforme ? C'est notre
          responsabilité de le corriger. Décrivez-nous le problème par email
          avec votre contexte (équipement, navigateur, technologie d'assistance
          utilisée) :
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
          Nous nous engageons à <strong>répondre sous 5 jours ouvrés</strong> et
          à corriger ou contourner l'obstacle dans les meilleurs délais. Si la
          correction technique demande du temps, nous proposerons une
          alternative immédiate (transcription, support direct, etc.).
        </p>
      </LegalSection>

      <LegalSection id="recours" num="8" title="Voies de recours">
        <p>
          Si vous constatez un défaut d'accessibilité non résolu après nous
          avoir contactés, vous pouvez :
        </p>
        <ul>
          <li>
            <strong>Saisir le Défenseur des droits</strong> :{" "}
            <a
              href="https://www.defenseurdesdroits.fr"
              rel="noopener noreferrer"
              target="_blank"
            >
              www.defenseurdesdroits.fr
            </a>
          </li>
          <li>
            Délégué local du Défenseur des droits :{" "}
            <a
              href="https://www.defenseurdesdroits.fr/saisir/contacter-delegue"
              rel="noopener noreferrer"
              target="_blank"
            >
              trouver un délégué près de chez vous
            </a>
          </li>
          <li>
            Adresse postale du Défenseur des droits : Défenseur des droits,
            Libre réponse 71120, 75342 Paris CEDEX 07 (gratuit, sans timbre)
          </li>
        </ul>
        <LegalHighlight variant="info">
          Cette déclaration d'accessibilité a été établie le {TODAY}. Elle sera
          mise à jour à chaque modification substantielle de la plateforme et au
          minimum tous les 12 mois.
        </LegalHighlight>
      </LegalSection>
    </LegalLayout>
  );
}
