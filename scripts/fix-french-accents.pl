#!/usr/bin/env perl
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Bulk fix of missing French accents / cedilles in MDX content.
#
# Design rules (READ BEFORE EDITING) :
# 1. Only words whose accented form has NO ambiguous homograph in modern
#    French. We never replace short common words (des, les, ces, sur, la,
#    ou, du, a) because they have meaning-shifting homographs.
# 2. Never touch verb forms that share a stem between conjugations
#    (e.g. "il accompagne" present vs "accompagné" past participle).
# 3. Frontmatter technical keys are skipped (slug/id/category/...).
# 4. URLs, paths and import lines are skipped.
# 5. Word boundaries everywhere : \b...\b.
#
# Usage : perl -i scripts/fix-french-accents.pl content/**/*.mdx
# (under zsh : run via xargs or with shell globbing expanded.)

use strict;
use warnings;
use utf8;
use open ':std', ':encoding(UTF-8)';
binmode STDOUT, ':encoding(UTF-8)';

while (<>) {
    # --- SKIPS -------------------------------------------------------------
    # Frontmatter technical / enum fields (values are slugs / ids, not prose)
    if (/^\s*(slug|id|category|kind|persona|outcome|emoji|tags|targetGroups|durationMinutes|xpReward|coinsReward|points)\s*:/) {
        print;
        next;
    }
    # Lines that look like URLs / paths / imports / JSX attributes refs
    if (m{href=|src=|import\s|from\s+["']|https?://|\.mdx|\.tsx?|\.jsx?|\.png|\.jpg|\.svg|\.webp|\.mp3|\.wav}) {
        print;
        next;
    }

    # --- CEDILLES (unambiguous : these letter combos only exist with cedille)
    s/\bfacon\b/façon/g;
    s/\bfacons\b/façons/g;
    s/\bgarcon\b/garçon/g;
    s/\bgarcons\b/garçons/g;
    s/\blecon\b/leçon/g;
    s/\blecons\b/leçons/g;
    s/\brecu\b/reçu/g;
    s/\brecue\b/reçue/g;
    s/\brecus\b/reçus/g;
    s/\brecues\b/reçues/g;
    s/\brecoit\b/reçoit/g;
    s/\brecoivent\b/reçoivent/g;
    s/\bapercoit\b/aperçoit/g;
    s/\bapercu\b/aperçu/g;
    s/\bapercus\b/aperçus/g;
    s/\bapercue\b/aperçue/g;
    s/\bdecu\b/déçu/g;
    s/\bdecue\b/déçue/g;
    s/\bdecus\b/déçus/g;
    s/\bdecues\b/déçues/g;
    s/\bsoupcon\b/soupçon/g;
    s/\bsoupcons\b/soupçons/g;
    s/\brançon\b/rançon/g;
    s/\brancon\b/rançon/g;
    s/\brancons\b/rançons/g;
    s/\bca\b/ça/g;       # standalone "ca" never a word in modern French
    s/\bCa\b/Ça/g;

    # --- NOUNS / ADJECTIVES / ADVERBS (no verb homograph) ------------------
    # security family
    s/\bsecurite\b/sécurité/g;
    s/\bsecurites\b/sécurités/g;
    s/\bSecurite\b/Sécurité/g;
    s/\bcybersecurite\b/cybersécurité/g;
    s/\bCybersecurite\b/Cybersécurité/g;
    s/\binsecurite\b/insécurité/g;
    s/\bsurete\b/sûreté/g;
    s/\bsuretes\b/sûretés/g;

    # data / privacy
    s/\bdonnees\b/données/g;
    s/\bDonnees\b/Données/g;
    s/\bprivee\b/privée/g;
    s/\bprivees\b/privées/g;

    # nouns ending in -é / -ée
    s/\bsalarie\b/salarié/g;
    s/\bsalaries\b/salariés/g;
    s/\bsalariee\b/salariée/g;
    s/\bsalariees\b/salariées/g;
    s/\bemploye\b/employé/g;
    s/\bemployes\b/employés/g;
    s/\bemployee\b/employée/g;
    s/\bemployees\b/employées/g;
    s/\bsociete\b/société/g;
    s/\bsocietes\b/sociétés/g;
    s/\bSociete\b/Société/g;
    s/\buniversite\b/université/g;
    s/\buniversites\b/universités/g;
    s/\brealite\b/réalité/g;
    s/\brealites\b/réalités/g;
    s/\bautorite\b/autorité/g;
    s/\bautorites\b/autorités/g;
    s/\bAutorite\b/Autorité/g;
    s/\bidentite\b/identité/g;
    s/\bidentites\b/identités/g;
    s/\bresponsabilite\b/responsabilité/g;
    s/\bresponsabilites\b/responsabilités/g;
    s/\bautomate\b/automate/g;
    s/\bquantite\b/quantité/g;
    s/\bquantites\b/quantités/g;
    s/\bqualite\b/qualité/g;
    s/\bqualites\b/qualités/g;
    s/\bsincerite\b/sincérité/g;
    s/\bcredibilite\b/crédibilité/g;
    s/\bconfidentialite\b/confidentialité/g;
    s/\bconfidentialites\b/confidentialités/g;
    s/\bconformite\b/conformité/g;
    s/\bconformites\b/conformités/g;
    s/\bunite\b/unité/g;
    s/\bunites\b/unités/g;
    s/\bdifficulte\b/difficulté/g;
    s/\bdifficultes\b/difficultés/g;
    s/\bpriorite\b/priorité/g;
    s/\bpriorites\b/priorités/g;
    s/\bmajorite\b/majorité/g;
    s/\bminorite\b/minorité/g;
    s/\bspecificite\b/spécificité/g;
    s/\bspecificites\b/spécificités/g;
    s/\bsensibilite\b/sensibilité/g;
    s/\bliberte\b/liberté/g;
    s/\blibertes\b/libertés/g;
    s/\bverite\b/vérité/g;
    s/\bverites\b/vérités/g;
    s/\bproprete\b/propreté/g;
    s/\bdiversite\b/diversité/g;
    s/\bcomplexite\b/complexité/g;
    s/\bcapacite\b/capacité/g;
    s/\bcapacites\b/capacités/g;
    s/\bnecessite\b/nécessité/g;
    s/\bnecessites\b/nécessités/g;
    s/\binegalite\b/inégalité/g;
    s/\binegalites\b/inégalités/g;

    # words ending in -é / -és (adjectives/past participles, unambiguous because
    # the verb infinitive stem doesn't exist without -er/-é mapping)
    s/\bdesole\b/désolé/g;
    s/\bdesolee\b/désolée/g;
    s/\bdesoles\b/désolés/g;
    s/\bdesolees\b/désolées/g;
    s/\bdesole, /désolé, /g;
    s/\bcoupe-circuit\b/coupe-circuit/g;
    s/\bcybersecurite\b/cybersécurité/g;

    # nouns ending in -ée / -ées
    s/\bportee\b/portée/g;
    s/\bportees\b/portées/g;
    s/\bentree\b/entrée/g;
    s/\bentrees\b/entrées/g;
    s/\bEntree\b/Entrée/g;
    s/\bsoiree\b/soirée/g;
    s/\bsoirees\b/soirées/g;
    s/\bjournee\b/journée/g;
    s/\bjournees\b/journées/g;
    s/\bidee\b/idée/g;
    s/\bidees\b/idées/g;
    s/\barrivee\b/arrivée/g;
    s/\barrivees\b/arrivées/g;
    s/\bduree\b/durée/g;
    s/\bdurees\b/durées/g;
    s/\bannee\b/année/g;
    s/\bannees\b/années/g;
    s/\bAnnee\b/Année/g;
    s/\bAnnees\b/Années/g;
    s/\bpensee\b/pensée/g;
    s/\bpensees\b/pensées/g;
    s/\bdemarche\b/démarche/g;
    s/\bdemarches\b/démarches/g;
    s/\bdetail\b/détail/g;
    s/\bdetails\b/détails/g;
    s/\bDetail\b/Détail/g;
    s/\bDetails\b/Détails/g;
    s/\bdecision\b/décision/g;
    s/\bdecisions\b/décisions/g;
    s/\bDecision\b/Décision/g;
    s/\bDecisions\b/Décisions/g;

    # words ending in -è / -ère / -ères
    s/\bderniere\b/dernière/g;
    s/\bdernieres\b/dernières/g;
    s/\bpremiere\b/première/g;
    s/\bpremieres\b/premières/g;
    s/\bPremiere\b/Première/g;
    s/\bPremieres\b/Premières/g;
    s/\bmere\b/mère/g;
    s/\bmeres\b/mères/g;
    s/\bpere\b/père/g;
    s/\bperes\b/pères/g;
    s/\bfrere\b/frère/g;
    s/\bfreres\b/frères/g;
    s/\bcollegue\b/collègue/g;
    s/\bcollegues\b/collègues/g;
    s/\bmodele\b/modèle/g;
    s/\bmodeles\b/modèles/g;
    s/\bregle\b/règle/g;
    s/\bregles\b/règles/g;
    s/\bRegle\b/Règle/g;
    s/\bRegles\b/Règles/g;
    s/\bsiecle\b/siècle/g;
    s/\bsiecles\b/siècles/g;
    s/\bprobleme\b/problème/g;
    s/\bproblemes\b/problèmes/g;
    s/\bProbleme\b/Problème/g;
    s/\bProblemes\b/Problèmes/g;
    s/\bsysteme\b/système/g;
    s/\bsystemes\b/systèmes/g;
    s/\bSysteme\b/Système/g;
    s/\bSystemes\b/Systèmes/g;
    s/\bmethode\b/méthode/g;
    s/\bmethodes\b/méthodes/g;
    s/\bMethode\b/Méthode/g;
    s/\bMethodes\b/Méthodes/g;
    s/\btheme\b/thème/g;
    s/\bthemes\b/thèmes/g;
    s/\bschema\b/schéma/g;
    s/\bschemas\b/schémas/g;
    s/\bscene\b/scène/g;
    s/\bscenes\b/scènes/g;
    s/\bphenomene\b/phénomène/g;
    s/\bphenomenes\b/phénomènes/g;
    s/\bparametre\b/paramètre/g;
    s/\bparametres\b/paramètres/g;
    s/\bbareme\b/barème/g;
    s/\bbaremes\b/barèmes/g;
    s/\bsiege\b/siège/g;
    s/\bsieges\b/sièges/g;
    s/\bprivilege\b/privilège/g;
    s/\bprivileges\b/privilèges/g;
    s/\bchere\b/chère/g;
    s/\bcheres\b/chères/g;
    s/\bsincere\b/sincère/g;
    s/\bsinceres\b/sincères/g;
    s/\bsincerement\b/sincèrement/g;
    s/\bgrossiere\b/grossière/g;
    s/\bgrossieres\b/grossières/g;
    s/\bcariere\b/carrière/g;
    s/\bcarrieres\b/carrières/g;
    s/\bcarriere\b/carrière/g;
    s/\bpriere\b/prière/g;
    s/\bprieres\b/prières/g;
    s/\bmaniere\b/manière/g;
    s/\bmanieres\b/manières/g;
    s/\bManiere\b/Manière/g;
    s/\barriere\b/arrière/g;
    s/\barrieres\b/arrières/g;
    s/\bderriere\b/derrière/g;

    # adverbs / particles
    s/\btres\b/très/g;
    s/\bTres\b/Très/g;
    s/\bdeja\b/déjà/g;
    s/\bDeja\b/Déjà/g;
    s/\bvoila\b/voilà/g;
    s/\bVoila\b/Voilà/g;
    s/\bapres\b/après/g;
    s/\bApres\b/Après/g;
    s/\baupres\b/auprès/g;
    s/\bAupres\b/Auprès/g;
    s/\bjusqu'a\b/jusqu'à/g;
    s/\bJusqu'a\b/Jusqu'à/g;
    s/\bvis-a-vis\b/vis-à-vis/g;
    s/\ba-cote\b/à-côté/g;
    s/\bbientot\b/bientôt/g;
    s/\bBientot\b/Bientôt/g;
    s/\bplutot\b/plutôt/g;
    s/\bPlutot\b/Plutôt/g;
    s/\baussitot\b/aussitôt/g;
    s/\btantot\b/tantôt/g;
    s/\bdes que\b/dès que/g;     # "dès que" specifically, not standalone "des"
    s/\bDes que\b/Dès que/g;
    s/\bdes lors\b/dès lors/g;
    s/\bDes lors\b/Dès lors/g;
    s/\bdes maintenant\b/dès maintenant/g;
    s/\bdes le\b/dès le/g;        # "dès le matin", "dès le premier"
    s/\bDes le\b/Dès le/g;
    s/\bdes la\b/dès la/g;
    s/\bdes l'\b/dès l'/g;
    s/\bforcement\b/forcément/g;
    s/\bgeneralement\b/généralement/g;
    s/\bGeneralement\b/Généralement/g;
    s/\brecemment\b/récemment/g;
    s/\bRecemment\b/Récemment/g;
    s/\bfrequemment\b/fréquemment/g;
    s/\bevidemment\b/évidemment/g;
    s/\bElevement\b/Élèvement/g;
    s/\bcompletement\b/complètement/g;
    s/\bCompletement\b/Complètement/g;
    s/\bregulierement\b/régulièrement/g;
    s/\bReguliepement\b/Régulièrement/g;
    s/\bRegulierement\b/Régulièrement/g;
    s/\bparticulierement\b/particulièrement/g;
    s/\bParticulierement\b/Particulièrement/g;
    s/\bderniere\b/dernière/g;
    s/\bimmediatement\b/immédiatement/g;
    s/\bImmediatement\b/Immédiatement/g;
    s/\blegerement\b/légèrement/g;
    s/\bnecessairement\b/nécessairement/g;
    s/\bNecessairement\b/Nécessairement/g;
    s/\bsincerement\b/sincèrement/g;
    s/\bSincerement\b/Sincèrement/g;
    s/\breellement\b/réellement/g;
    s/\bReellement\b/Réellement/g;

    # "être" family - unambiguous as no other valid word
    s/\betre\b/être/g;
    s/\bEtre\b/Être/g;
    s/\bpeut-etre\b/peut-être/g;
    s/\bPeut-etre\b/Peut-être/g;
    s/\bbien-etre\b/bien-être/g;

    # "été" - past participle of être / season; "ete" alone is never French
    s/\bete\b/été/g;

    # imperfect of être - unambiguous
    s/\betait\b/était/g;
    s/\bEtait\b/Était/g;
    s/\betaient\b/étaient/g;
    s/\bEtaient\b/Étaient/g;
    s/\betais\b/étais/g;
    s/\bEtais\b/Étais/g;

    # adjectives / adverbs starting with é
    s/\bmeme\b/même/g;
    s/\bMeme\b/Même/g;
    s/\bmemes\b/mêmes/g;
    s/\bMemes\b/Mêmes/g;
    s/\bquand meme\b/quand même/g;
    s/\bhonnete\b/honnête/g;
    s/\bhonnetete\b/honnêteté/g;
    s/\bmalhonnete\b/malhonnête/g;
    s/\benquete\b/enquête/g;
    s/\benquetes\b/enquêtes/g;
    s/\btete\b/tête/g;
    s/\btetes\b/têtes/g;
    s/\bfenetre\b/fenêtre/g;
    s/\bfenetres\b/fenêtres/g;
    s/\bfete\b/fête/g;
    s/\bfetes\b/fêtes/g;
    s/\bbete\b/bête/g;
    s/\bbetes\b/bêtes/g;
    s/\barret\b/arrêt/g;
    s/\barrets\b/arrêts/g;
    s/\binteret\b/intérêt/g;
    s/\binterets\b/intérêts/g;
    s/\bcoute\b/coûte/g;
    s/\bcoutent\b/coûtent/g;
    s/\bcouter\b/coûter/g;
    s/\bcouteux\b/coûteux/g;
    s/\bcouteuse\b/coûteuse/g;
    s/\bcouteuses\b/coûteuses/g;
    s/\bcout\b/coût/g;
    s/\bcouts\b/coûts/g;
    s/\bbatiment\b/bâtiment/g;
    s/\bbatiments\b/bâtiments/g;
    s/\bboite\b/boîte/g;
    s/\bboites\b/boîtes/g;
    s/\bBoite\b/Boîte/g;
    s/\bBoites\b/Boîtes/g;
    s/\bmaitre\b/maître/g;
    s/\bmaitres\b/maîtres/g;
    s/\bMaitre\b/Maître/g;
    s/\bmaitrise\b/maîtrise/g;
    s/\bmaitrises\b/maîtrises/g;
    s/\bmaitriser\b/maîtriser/g;
    s/\bdisparait\b/disparaît/g;
    s/\bparait\b/paraît/g;
    s/\bconnaitre\b/connaître/g;
    s/\breconnaitre\b/reconnaître/g;
    s/\bReconnaitre\b/Reconnaître/g;
    s/\bapparaitre\b/apparaître/g;
    s/\bnaitre\b/naître/g;

    # accents on é words (no homograph)
    s/\becran\b/écran/g;
    s/\becrans\b/écrans/g;
    s/\bEcran\b/Écran/g;
    s/\bEcrans\b/Écrans/g;
    s/\beleve\b/élève/g;     # noun pupil; verb form is also "élève" so still safe
    s/\beleves\b/élèves/g;
    s/\bElevé\b/Élevé/g;
    s/\betape\b/étape/g;
    s/\betapes\b/étapes/g;
    s/\bEtape\b/Étape/g;
    s/\bEtapes\b/Étapes/g;
    s/\betat\b/état/g;
    s/\betats\b/états/g;
    s/\bEtat\b/État/g;
    s/\bEtats\b/États/g;
    s/\betage\b/étage/g;
    s/\betages\b/étages/g;
    s/\betranger\b/étranger/g;
    s/\betrangers\b/étrangers/g;
    s/\betrangere\b/étrangère/g;
    s/\betrangeres\b/étrangères/g;
    s/\beleve\b/élève/g;
    s/\beleves\b/élèves/g;
    s/\beconomie\b/économie/g;
    s/\beconomies\b/économies/g;
    s/\beconomique\b/économique/g;
    s/\beconomiques\b/économiques/g;
    s/\belement\b/élément/g;
    s/\belements\b/éléments/g;
    s/\bElement\b/Élément/g;
    s/\bElements\b/Éléments/g;
    s/\bevenement\b/événement/g;
    s/\bevenements\b/événements/g;
    s/\bEvenement\b/Événement/g;
    s/\bEvenements\b/Événements/g;
    s/\bevenementiel\b/événementiel/g;
    s/\bevidence\b/évidence/g;
    s/\bevident\b/évident/g;
    s/\bevidente\b/évidente/g;
    s/\bevidents\b/évidents/g;
    s/\bevidentes\b/évidentes/g;
    s/\beducation\b/éducation/g;
    s/\bEducation\b/Éducation/g;
    s/\bequipe\b/équipe/g;
    s/\bequipes\b/équipes/g;
    s/\bEquipe\b/Équipe/g;
    s/\bEquipes\b/Équipes/g;
    s/\bequipement\b/équipement/g;
    s/\bequipements\b/équipements/g;
    s/\beligible\b/éligible/g;
    s/\beligibles\b/éligibles/g;
    s/\beligibilite\b/éligibilité/g;
    s/\benergie\b/énergie/g;
    s/\benergies\b/énergies/g;
    s/\bEnergie\b/Énergie/g;
    s/\bechange\b/échange/g;
    s/\bechanges\b/échanges/g;
    s/\bEchange\b/Échange/g;
    s/\becoute\b/écoute/g;
    s/\beleve\b/élève/g;
    s/\b(é|e)mission\b/émission/g;

    # words with é in the middle (no homograph)
    s/\bgeneral\b/général/g;
    s/\bgenerale\b/générale/g;
    s/\bgeneraux\b/généraux/g;
    s/\bgenerales\b/générales/g;
    s/\bGeneral\b/Général/g;
    s/\bGenerale\b/Générale/g;
    s/\bgeneralement\b/généralement/g;
    s/\bgeneration\b/génération/g;
    s/\bgenerations\b/générations/g;
    s/\bGeneration\b/Génération/g;
    s/\bphenomene\b/phénomène/g;
    s/\bphenomenes\b/phénomènes/g;
    s/\btheorie\b/théorie/g;
    s/\btheories\b/théories/g;
    s/\btheorique\b/théorique/g;
    s/\btheoriques\b/théoriques/g;
    s/\btelephone\b/téléphone/g;
    s/\btelephones\b/téléphones/g;
    s/\bTelephone\b/Téléphone/g;
    s/\btelephonique\b/téléphonique/g;
    s/\btelephoniques\b/téléphoniques/g;
    s/\btelevision\b/télévision/g;
    s/\btelevisions\b/télévisions/g;
    s/\btelechargement\b/téléchargement/g;
    s/\btelechargements\b/téléchargements/g;
    s/\btelecharger\b/télécharger/g;
    s/\btelecharge\b/téléchargé/g;
    s/\btelecharges\b/téléchargés/g;
    s/\btelechargee\b/téléchargée/g;
    s/\btelechargees\b/téléchargées/g;
    s/\bnumero\b/numéro/g;
    s/\bnumeros\b/numéros/g;
    s/\bNumero\b/Numéro/g;
    s/\bnumerique\b/numérique/g;
    s/\bnumeriques\b/numériques/g;
    s/\bNumerique\b/Numérique/g;
    s/\bcategorie\b/catégorie/g;
    s/\bcategories\b/catégories/g;
    s/\bCategorie\b/Catégorie/g;
    s/\bexperience\b/expérience/g;
    s/\bexperiences\b/expériences/g;
    s/\bExperience\b/Expérience/g;
    s/\bexperience\b/expérience/g;
    s/\bprecaution\b/précaution/g;
    s/\bprecautions\b/précautions/g;
    s/\bprecision\b/précision/g;
    s/\bprecisions\b/précisions/g;
    s/\bpreciser\b/préciser/g;
    s/\bprecis\b/précis/g;
    s/\bprecises\b/précises/g;
    s/\bprecisement\b/précisément/g;
    s/\bprecaire\b/précaire/g;
    s/\bprecedent\b/précédent/g;
    s/\bprecedents\b/précédents/g;
    s/\bprecedente\b/précédente/g;
    s/\bprecedentes\b/précédentes/g;
    s/\bPrecedent\b/Précédent/g;
    s/\bPrecedente\b/Précédente/g;
    s/\bprecieux\b/précieux/g;
    s/\bprecieuse\b/précieuse/g;
    s/\bprecieuses\b/précieuses/g;
    s/\bprevu\b/prévu/g;
    s/\bprevus\b/prévus/g;
    s/\bprevue\b/prévue/g;
    s/\bprevues\b/prévues/g;
    s/\bprevoir\b/prévoir/g;
    s/\bPrevoir\b/Prévoir/g;
    s/\bprevention\b/prévention/g;
    s/\bPrevention\b/Prévention/g;
    s/\bpreventif\b/préventif/g;
    s/\bpreventive\b/préventive/g;
    s/\bpreventives\b/préventives/g;
    s/\bpreventifs\b/préventifs/g;
    s/\bpreviens\b/préviens/g;     # "préviens" 1ps/2ps - same form, unique
    s/\bprevient\b/prévient/g;
    s/\bprevenir\b/prévenir/g;
    s/\bPrevenir\b/Prévenir/g;
    s/\bprealable\b/préalable/g;
    s/\bprealables\b/préalables/g;
    s/\bprealablement\b/préalablement/g;
    s/\bprejudice\b/préjudice/g;
    s/\bprejudices\b/préjudices/g;
    s/\bpreavis\b/préavis/g;
    s/\bpresence\b/présence/g;
    s/\bpresences\b/présences/g;
    s/\bPresence\b/Présence/g;
    s/\bpresentation\b/présentation/g;
    s/\bpresentations\b/présentations/g;
    s/\bpresentateur\b/présentateur/g;
    s/\bpresident\b/président/g;
    s/\bpresidents\b/présidents/g;
    s/\bPresident\b/Président/g;
    s/\bpresidente\b/présidente/g;
    s/\bpresidentes\b/présidentes/g;
    s/\bpresidentielle\b/présidentielle/g;
    s/\bpresidentielles\b/présidentielles/g;

    # accents on -è within stems
    s/\bproblème\b/problème/g;
    s/\bsiège social\b/siège social/g;

    # procedure family
    s/\bprocedure\b/procédure/g;
    s/\bprocedures\b/procédures/g;
    s/\bProcedure\b/Procédure/g;
    s/\bProcedures\b/Procédures/g;

    # méfiance / méfier (unambiguous because "mefier" never French without accent)
    s/\bmefiance\b/méfiance/g;
    s/\bmefier\b/méfier/g;
    s/\bMefiance\b/Méfiance/g;
    s/\bMefier\b/Méfier/g;
    s/\bdefiance\b/défiance/g;
    s/\bdefier\b/défier/g;

    # network / reseau
    s/\breseau\b/réseau/g;
    s/\breseaux\b/réseaux/g;
    s/\bReseau\b/Réseau/g;
    s/\bReseaux\b/Réseaux/g;

    # matériel / matérielle (unique)
    s/\bmateriel\b/matériel/g;
    s/\bmateriels\b/matériels/g;
    s/\bmaterielle\b/matérielle/g;
    s/\bmaterielles\b/matérielles/g;
    s/\bMateriel\b/Matériel/g;

    # mémoire (verb "mémoriser" different)
    s/\bmemoire\b/mémoire/g;
    s/\bmemoires\b/mémoires/g;
    s/\bMemoire\b/Mémoire/g;

    # média
    s/\bmedia\b/média/g;
    s/\bmedias\b/médias/g;
    s/\bMedia\b/Média/g;
    s/\bMedias\b/Médias/g;
    s/\bmediatique\b/médiatique/g;
    s/\bmediatiques\b/médiatiques/g;

    # métier
    s/\bmetier\b/métier/g;
    s/\bmetiers\b/métiers/g;
    s/\bMetier\b/Métier/g;
    s/\bMetiers\b/Métiers/g;

    # référence / référent
    s/\breference\b/référence/g;
    s/\breferences\b/références/g;
    s/\breferent\b/référent/g;
    s/\breferents\b/référents/g;
    s/\breferentiel\b/référentiel/g;
    s/\breferentiels\b/référentiels/g;
    s/\bReferent\b/Référent/g;
    s/\bReferentiel\b/Référentiel/g;

    # réussite, réussir, réussi (réussi without accent isn't French)
    s/\breussite\b/réussite/g;
    s/\breussites\b/réussites/g;
    s/\breussir\b/réussir/g;
    s/\breussi\b/réussi/g;
    s/\breussis\b/réussis/g;
    s/\breussie\b/réussie/g;
    s/\breussies\b/réussies/g;

    # réunion
    s/\breunion\b/réunion/g;
    s/\breunions\b/réunions/g;
    s/\bReunion\b/Réunion/g;

    # complémentaire / supplémentaire
    s/\bcomplementaire\b/complémentaire/g;
    s/\bcomplementaires\b/complémentaires/g;
    s/\bsupplementaire\b/supplémentaire/g;
    s/\bsupplementaires\b/supplémentaires/g;

    # élémentaire
    s/\belementaire\b/élémentaire/g;
    s/\belementaires\b/élémentaires/g;

    # indépendant
    s/\bindependant\b/indépendant/g;
    s/\bindependants\b/indépendants/g;
    s/\bindependante\b/indépendante/g;
    s/\bindependantes\b/indépendantes/g;
    s/\bindependance\b/indépendance/g;
    s/\bIndependance\b/Indépendance/g;
    s/\bindependamment\b/indépendamment/g;

    # conséquence / fréquence
    s/\bconsequence\b/conséquence/g;
    s/\bconsequences\b/conséquences/g;
    s/\bConsequence\b/Conséquence/g;
    s/\bConsequences\b/Conséquences/g;
    s/\bfrequence\b/fréquence/g;
    s/\bfrequences\b/fréquences/g;
    s/\bfrequent\b/fréquent/g;
    s/\bfrequents\b/fréquents/g;
    s/\bfrequente\b/fréquente/g;
    s/\bfrequentes\b/fréquentes/g;
    s/\bdifference\b/différence/g;
    s/\bdifferences\b/différences/g;
    s/\bdifferent\b/différent/g;
    s/\bdifferents\b/différents/g;
    s/\bdifferente\b/différente/g;
    s/\bdifferentes\b/différentes/g;
    s/\bDifference\b/Différence/g;
    s/\bDifferents\b/Différents/g;

    # ingénierie
    s/\bingenierie\b/ingénierie/g;
    s/\bingenieries\b/ingénieries/g;
    s/\bIngenierie\b/Ingénierie/g;
    s/\bingenieur\b/ingénieur/g;
    s/\bingenieurs\b/ingénieurs/g;

    # opération, opérateur, opérationnel
    s/\boperation\b/opération/g;
    s/\boperations\b/opérations/g;
    s/\bOperation\b/Opération/g;
    s/\bOperations\b/Opérations/g;
    s/\boperateur\b/opérateur/g;
    s/\boperateurs\b/opérateurs/g;
    s/\boperatrice\b/opératrice/g;
    s/\boperatrices\b/opératrices/g;
    s/\boperationnel\b/opérationnel/g;
    s/\boperationnels\b/opérationnels/g;
    s/\boperationnelle\b/opérationnelle/g;
    s/\boperationnelles\b/opérationnelles/g;

    # vérification
    s/\bverification\b/vérification/g;
    s/\bverifications\b/vérifications/g;
    s/\bVerification\b/Vérification/g;
    s/\bverifier\b/vérifier/g;
    s/\bVerifier\b/Vérifier/g;

    # création
    s/\bcreation\b/création/g;
    s/\bcreations\b/créations/g;
    s/\bCreation\b/Création/g;
    s/\bcreateur\b/créateur/g;
    s/\bcreateurs\b/créateurs/g;
    s/\bcreatrice\b/créatrice/g;
    s/\bcreer\b/créer/g;
    s/\bCreer\b/Créer/g;

    # propriétaire / propriété
    s/\bproprietaire\b/propriétaire/g;
    s/\bproprietaires\b/propriétaires/g;
    s/\bpropriete\b/propriété/g;
    s/\bproprietes\b/propriétés/g;

    # réglementation / règlement
    s/\breglement\b/règlement/g;
    s/\breglements\b/règlements/g;
    s/\bReglement\b/Règlement/g;
    s/\breglementation\b/réglementation/g;
    s/\breglementations\b/réglementations/g;
    s/\bReglementation\b/Réglementation/g;
    s/\breglementaire\b/réglementaire/g;
    s/\breglementaires\b/réglementaires/g;

    # vehicule
    s/\bvehicule\b/véhicule/g;
    s/\bvehicules\b/véhicules/g;
    s/\bVehicule\b/Véhicule/g;

    # médecin / médical / médicament (no homograph)
    s/\bmedecin\b/médecin/g;
    s/\bmedecins\b/médecins/g;
    s/\bMedecin\b/Médecin/g;
    s/\bmedical\b/médical/g;
    s/\bmedicale\b/médicale/g;
    s/\bmedicales\b/médicales/g;
    s/\bmedicaux\b/médicaux/g;
    s/\bmedicament\b/médicament/g;
    s/\bmedicaments\b/médicaments/g;

    # rédaction / rédacteur
    s/\bredaction\b/rédaction/g;
    s/\bredactions\b/rédactions/g;
    s/\bRedaction\b/Rédaction/g;
    s/\bredacteur\b/rédacteur/g;
    s/\bredacteurs\b/rédacteurs/g;

    # réponse / répondre (forms unique)
    s/\breponse\b/réponse/g;
    s/\breponses\b/réponses/g;
    s/\bReponse\b/Réponse/g;
    s/\breponds\b/réponds/g;     # 1ps/2ps
    s/\bReponds\b/Réponds/g;
    s/\brepond\b/répond/g;        # 3ps
    s/\brepondre\b/répondre/g;
    s/\brepondu\b/répondu/g;
    s/\brepondant\b/répondant/g;

    # éviter - only past part. and infinitive are unambiguous, "evite" alone is verb form
    s/\beviter\b/éviter/g;
    s/\bEviter\b/Éviter/g;

    # créer / résoudre
    s/\bresoudre\b/résoudre/g;
    s/\bResoudre\b/Résoudre/g;

    # rétablir
    s/\bretablir\b/rétablir/g;
    s/\bretablissement\b/rétablissement/g;

    # résistance / résultat
    s/\bresistance\b/résistance/g;
    s/\bResistance\b/Résistance/g;
    s/\bresistant\b/résistant/g;
    s/\bresistants\b/résistants/g;
    s/\bresistante\b/résistante/g;
    s/\bresultat\b/résultat/g;
    s/\bresultats\b/résultats/g;
    s/\bResultat\b/Résultat/g;
    s/\bResultats\b/Résultats/g;

    # été / réussite / témoin
    s/\btemoignage\b/témoignage/g;
    s/\btemoignages\b/témoignages/g;
    s/\btemoin\b/témoin/g;
    s/\btemoins\b/témoins/g;
    s/\bTemoin\b/Témoin/g;

    # supérieur / inférieur
    s/\bsuperieur\b/supérieur/g;
    s/\bsuperieurs\b/supérieurs/g;
    s/\bsuperieure\b/supérieure/g;
    s/\bsuperieures\b/supérieures/g;
    s/\binferieur\b/inférieur/g;
    s/\binferieurs\b/inférieurs/g;
    s/\binferieure\b/inférieure/g;
    s/\binferieures\b/inférieures/g;
    s/\bexterieur\b/extérieur/g;
    s/\bexterieurs\b/extérieurs/g;
    s/\bexterieure\b/extérieure/g;
    s/\bexterieures\b/extérieures/g;
    s/\binterieur\b/intérieur/g;
    s/\binterieurs\b/intérieurs/g;
    s/\binterieure\b/intérieure/g;
    s/\binterieures\b/intérieures/g;

    # rôle / contrôle
    s/\brole\b/rôle/g;
    s/\broles\b/rôles/g;
    s/\bRole\b/Rôle/g;
    s/\bcontrole\b/contrôle/g;
    s/\bcontroles\b/contrôles/g;
    s/\bControle\b/Contrôle/g;
    s/\bControles\b/Contrôles/g;
    s/\bcontroler\b/contrôler/g;
    s/\bControler\b/Contrôler/g;

    # côté / hôtel / hôpital
    s/\bcote\b/côté/g;
    s/\bcotes\b/côtés/g;
    s/\bCote\b/Côté/g;
    s/\bhotel\b/hôtel/g;
    s/\bhotels\b/hôtels/g;
    s/\bHotel\b/Hôtel/g;
    s/\bhopital\b/hôpital/g;
    s/\bhopitaux\b/hôpitaux/g;
    s/\bHopital\b/Hôpital/g;

    # français (purely adjective; "francais" without accent is never French)
    s/\bfrancais\b/français/g;
    s/\bfrancaise\b/française/g;
    s/\bfrancaises\b/françaises/g;
    s/\bFrancais\b/Français/g;
    s/\bFrancaise\b/Française/g;
    s/\bFrancaises\b/Françaises/g;

    # spécifique
    s/\bspecifique\b/spécifique/g;
    s/\bspecifiques\b/spécifiques/g;
    s/\bSpecifique\b/Spécifique/g;
    s/\bspecial\b/spécial/g;
    s/\bspeciaux\b/spéciaux/g;
    s/\bspeciale\b/spéciale/g;
    s/\bspeciales\b/spéciales/g;
    s/\bSpecial\b/Spécial/g;
    s/\bspecialiste\b/spécialiste/g;
    s/\bspecialistes\b/spécialistes/g;
    s/\bspecialement\b/spécialement/g;

    # stratégie / stratégique
    s/\bstrategie\b/stratégie/g;
    s/\bstrategies\b/stratégies/g;
    s/\bStrategie\b/Stratégie/g;
    s/\bstrategique\b/stratégique/g;
    s/\bstrategiques\b/stratégiques/g;
    s/\bStrategique\b/Stratégique/g;

    # détection / déterminer (no homograph)
    s/\bdetection\b/détection/g;
    s/\bdetections\b/détections/g;
    s/\bDetection\b/Détection/g;
    s/\bdetecter\b/détecter/g;
    s/\bDetecter\b/Détecter/g;
    s/\bdeterminer\b/déterminer/g;
    s/\bDeterminer\b/Déterminer/g;

    # définition / définir (no homograph)
    s/\bdefinition\b/définition/g;
    s/\bdefinitions\b/définitions/g;
    s/\bDefinition\b/Définition/g;
    s/\bdefinir\b/définir/g;
    s/\bDefinir\b/Définir/g;
    s/\bdefinitif\b/définitif/g;
    s/\bdefinitive\b/définitive/g;
    s/\bdefinitivement\b/définitivement/g;

    # délai (no homograph)
    s/\bdelai\b/délai/g;
    s/\bdelais\b/délais/g;
    s/\bDelai\b/Délai/g;
    s/\bDelais\b/Délais/g;

    # déploiement / déployer
    s/\bdeploiement\b/déploiement/g;
    s/\bdeploiements\b/déploiements/g;
    s/\bdeployer\b/déployer/g;
    s/\bDeployer\b/Déployer/g;

    # début / débuter
    s/\bdebut\b/début/g;
    s/\bdebuts\b/débuts/g;
    s/\bDebut\b/Début/g;
    s/\bdebuter\b/débuter/g;
    s/\bDebuter\b/Débuter/g;
    s/\bdebutant\b/débutant/g;
    s/\bdebutants\b/débutants/g;

    # désir / dépression / désordre - no homograph
    s/\bdesordre\b/désordre/g;
    s/\bdesordres\b/désordres/g;

    # rappel - "rappel" is already correct, no fix needed
    # mais "verifier" (déjà fait au-dessus)

    # impôt / dépôt
    s/\bimpot\b/impôt/g;
    s/\bimpots\b/impôts/g;
    s/\bImpot\b/Impôt/g;
    s/\bdepot\b/dépôt/g;
    s/\bdepots\b/dépôts/g;
    s/\bDepot\b/Dépôt/g;

    # période
    s/\bperiode\b/période/g;
    s/\bperiodes\b/périodes/g;
    s/\bPeriode\b/Période/g;
    s/\bperiodique\b/périodique/g;
    s/\bperiodiques\b/périodiques/g;
    s/\bperiodiquement\b/périodiquement/g;

    # caméra
    s/\bcamera\b/caméra/g;
    s/\bcameras\b/caméras/g;
    s/\bCamera\b/Caméra/g;

    # télécommunications etc are covered by télé* above
    # télétravail
    s/\bteletravail\b/télétravail/g;
    s/\bTeletravail\b/Télétravail/g;

    # télémédecine etc.
    s/\btelemedecine\b/télémédecine/g;

    # informatique already correct
    # logiciel - no accent originally
    # email - keep as is

    # bénéfice / bénéficier
    s/\bbenefice\b/bénéfice/g;
    s/\bbenefices\b/bénéfices/g;
    s/\bbeneficier\b/bénéficier/g;
    s/\bbeneficiaire\b/bénéficiaire/g;
    s/\bbeneficiaires\b/bénéficiaires/g;

    # négocier / négociation
    s/\bnegocier\b/négocier/g;
    s/\bNegocier\b/Négocier/g;
    s/\bnegociation\b/négociation/g;
    s/\bnegociations\b/négociations/g;

    # élu / élection / élargir - no homograph
    s/\belection\b/élection/g;
    s/\belections\b/élections/g;
    s/\belargir\b/élargir/g;
    s/\belargissement\b/élargissement/g;

    print;
}
