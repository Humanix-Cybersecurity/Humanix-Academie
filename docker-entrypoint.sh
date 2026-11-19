#!/bin/sh
set -e

# Les binaires sont appeles par leur CHEMIN, pas par `npx`.
#
# `npx` appartient a npm, et npm n'est plus dans l'image d'execution : ses
# dependances embarquees portaient a elles seules les 8 dernieres CVE de
# l'image publiee (tar, sigstore, brace-expansion, ip-address, tinyglobby).
# Aucune ne venait de nos dependances a nous, et aucune n'etait corrigeable
# autrement qu'en changeant d'image de base -- ou en retirant npm.
#
# `npx prisma` ne faisait de toute facon que resoudre ./node_modules/.bin/prisma.
# L'appeler directement supprime un intermediaire, et le demarrage y gagne.

echo ""
echo "  =============================================="
echo "  HumaniX Academy - Demarrage du conteneur"
echo "  =============================================="
echo ""

# Attendre que Postgres soit pret. Appelee dans les deux modes : meme un
# conteneur qui ne prepare rien a besoin d'une base joignable.
attendre_postgres() {
echo "[1/5] Attente Postgres..."
RETRY=0
until ./node_modules/.bin/prisma db execute --schema=./prisma/schema.prisma --stdin >/dev/null 2>&1 <<EOF
SELECT 1;
EOF
do
  RETRY=$((RETRY+1))
  if [ $RETRY -gt 30 ]; then
    echo "  -> Timeout attente Postgres (verifie DATABASE_URL)"
    exit 1
  fi
  sleep 1
done
echo "  -> Postgres pret"
}

# -----------------------------------------------------------------------------
# PREPARATION : tout ce qui mute l'etat PARTAGE (schema + donnees communes).
#
# POURQUOI C'EST ISOLE
#
#   Une livraison sans coupure fait tourner DEUX versions de l'application en
#   meme temps, le temps de basculer le trafic. Si chaque conteneur executait
#   `prisma db push --accept-data-loss` a son demarrage, la nouvelle version
#   modifierait le schema pendant que l'ancienne sert encore : un renommage ou
#   une suppression de colonne la casserait instantanement, sans rien demander.
#
#   Ces etapes s'executent donc UNE FOIS, avant la bascule.
#
# COMMENT L'APPELER
#
#   docker-entrypoint.sh preparer      execute la preparation puis sort.
#                                      C'est ce que fait scripts/deploy.sh.
#
#   HUMANIX_PREPARER_AU_DEMARRAGE=false
#                                      le demarrage ne prepare plus rien et va
#                                      directement a Next.js.
#
#   Par DEFAUT la preparation reste faite au demarrage : une installation
#   auto-hebergee (Community Edition) doit continuer a marcher avec un simple
#   `compose up`, sans etape supplementaire a connaitre.
# -----------------------------------------------------------------------------
preparer_etat_partage() {
  # Sync du schema (db push : pas de migration formelle, parfait pour POC)
  echo "[2/5] Synchronisation du schema Prisma..."
  ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss

  # Migrations legacy (idempotentes, no-op apres le 1er passage) :
  #   - migrate-legacy-trial.ts : retire l'ancien plan "trial" (pivot vente directe)
  #   - migrate-4-tiers-pivot.ts : passe de 5 paliers (decouverte/solo/essentielle/
  #     pro/premium) a 3 paliers (starter/pro/enterprise) - pivot mai 2026.
  echo "[2.5/5] Migrations legacy plans (idempotentes)..."
  node dist-scripts/scripts/migrate-legacy-trial.mjs || echo "  -> migrate-legacy-trial ignoree (non bloquante)"
  node dist-scripts/scripts/migrate-4-tiers-pivot.mjs || echo "  -> migrate-4-tiers-pivot ignoree (non bloquante)"

  # Seed du CATALOG partage (saisons + episodes + badges + boutique + tenant
  # Communaute) - PROD-SAFE et idempotent (upserts par slug, AUCUN fake user).
  # DOIT tourner a CHAQUE deploiement : sinon les nouvelles saisons / badges
  # ajoutes au code ne se propagent JAMAIS en BDD de prod (bug modules + badges,
  # juin 2026). Le script reevalue aussi les badges des users (retroactif).
  echo "[3/5] Seed du catalog partage (saisons, episodes, badges, boutique)..."
  node dist-scripts/scripts/seed-catalog.mjs || echo "  -> seed-catalog a echoue (non bloquant), relancable via /superadmin/catalog"

  # En mode demo UNIQUEMENT : seed des comptes de demonstration (fake users),
  # inappropries en prod. seed.ts re-appelle seedCatalog en interne (idempotent).
  if [ "$DEMO_MODE" = "true" ]; then
    echo "  -> DEMO_MODE=true, seed des comptes de demonstration"
    # Le bundle compile directement, pas `prisma db seed` : celui-ci depend
    # de prisma.config.ts, longtemps absent de l'image, et sortait alors en
    # silence sans rien seeder (constate le 2026-10-20). Une demo sans ses
    # comptes n'est pas une demo : l'echec arrete la preparation.
    node dist-scripts/prisma/seed.mjs || { echo "  -> ECHEC du seed de demonstration" >&2; exit 1; }
  fi

  # Bootstrap du premier administrateur si la base est vierge.
  # Idempotent : se desactive automatiquement des qu'un user existe.
  # Variables BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD (cf. .env.example).
  echo "[4/5] Bootstrap admin..."
  node dist-scripts/scripts/bootstrap-admin.mjs || echo "  -> bootstrap-admin a echoue, on continue (l'app peut demarrer)"

  # Premier import de l'observatoire des fuites - uniquement si la table est
  # vide (pour ne pas re-scraper a chaque redemarrage). Le mode --deep parcourt
  # les archives par annee pour construire un historique meaningful.
  # Les scrapes suivants sont declenches par le cron externe sur
  # /api/cron/breaches-refresh (configure independamment).
  echo "[5/5] Observatoire des fuites - premier import si necessaire..."
  HAS_BREACHES=$(node --input-type=module -e "
  import { PrismaClient } from '@prisma/client';
  const p = new PrismaClient();
  p.dataBreach.count()
    .then((n) => { console.log(n > 0 ? 'yes' : 'no'); return p.\$disconnect(); })
    .catch(() => { console.log('no'); return p.\$disconnect(); });
  " 2>/dev/null | tail -n 1)

  if [ "$HAS_BREACHES" = "yes" ]; then
    echo "  -> Table DataBreach deja peuplee, skip de l'import initial"
  else
    echo "  -> Table DataBreach vide, import deep en cours (peut prendre 1-2 min)..."
    # Timeout 180s pour ne pas bloquer le demarrage si une source est lente.
    # En cas d'echec partiel, le cron externe rattrapera au prochain run.
    timeout 180 node dist-scripts/scripts/scrape-breaches.mjs --deep \
      || echo "  -> Import partiel ou echec reseau, reessai au prochain cron"
  fi
}

# -----------------------------------------------------------------------------
# GARDE : la base correspond-elle au schema du code ?
#
# POURQUOI
#
#   Depuis que la preparation est sortie du demarrage, le conteneur SUPPOSE que
#   quelqu'un l'a faite. Si l'etape de deploiement ne s'execute pas -- script
#   pas encore a jour, erreur avalee, lancement manuel oublie -- l'application
#   demarre quand meme et repond normalement, contre une base non migree.
#
#   C'est arrive le 2026-08-19 : un deploiement complet n'a rien prepare, et
#   rien ne l'a signale. Le service etait « healthy ». Ce jour-la le schema
#   n'avait pas change, donc sans consequence. La fois suivante, non.
#
#   Un service qui repond faux est pire qu'un service qui refuse de demarrer.
#
# COMMENT
#
#   `prisma migrate diff` compare la base VIVANTE (--from-schema-datasource,
#   qui lit l'URL du datasource) au schema du CODE (--to-schema-datamodel).
#   Avec --exit-code : 0 = en phase, 2 = derive, 1 = erreur de l'outil.
#
# QUE FAIRE EN CAS DE DERIVE
#
#   Pas de contournement dedie, et c'est deliberé : la sortie de secours est
#   HUMANIX_PREPARER_AU_DEMARRAGE=true, qui fait preparer le conteneur
#   lui-meme. C'est la vraie correction, pas un interrupteur qui masque.
# -----------------------------------------------------------------------------
verifier_schema() {
  echo "[garde] Verification : la base correspond-elle au schema du code ?"
  ./node_modules/.bin/prisma migrate diff \
    --from-schema-datasource ./prisma/schema.prisma \
    --to-schema-datamodel ./prisma/schema.prisma \
    --exit-code >/dev/null 2>&1
  code=$?

  if [ "$code" -eq 0 ]; then
    echo "  -> base en phase avec le schema."
    return 0
  fi

  if [ "$code" -eq 2 ]; then
    echo ""
    echo "  =============================================="
    echo "  DEMARRAGE REFUSE : la base ne correspond pas au schema du code."
    echo "  =============================================="
    echo ""
    echo "  La preparation n'a pas ete faite pour cette version."
    echo ""
    echo "  Corriger :   ./scripts/deploy.sh <demo|prod>"
    echo "  Ou seul  :   compose run --rm --no-deps app preparer"
    echo ""
    echo "  En dernier recours, poser HUMANIX_PREPARER_AU_DEMARRAGE=true :"
    echo "  le conteneur preparera lui-meme au demarrage."
    echo ""
    exit 1
  fi

  # Code 1 : l'outil n'a pas su repondre. On NE bloque PAS.
  #
  # Un signal ambigu ne doit pas coucher un service sain -- une base
  # momentanement lente au demarrage suffirait a rendre le conteneur
  # inredemarrable, y compris apres un reboot. On demarre, en le disant fort.
  echo "  -> AVERTISSEMENT : verification impossible (code $code)."
  echo "     Le demarrage continue, mais la conformite du schema n'est PAS etablie."
  return 0
}

# -----------------------------------------------------------------------------
# GARDE : les secrets sont-ils de vrais secrets ?
#
# POURQUOI
#
#   AUTH_SECRET signe les sessions : qui le connait se fabrique celle de
#   n'importe quel compte, administration comprise, sans mot de passe. Il
#   chiffre aussi les mots de passe SMTP et CISO Assistant ranges en base, et
#   signe les liens de desinscription.
#
#   Or ce depot a publie des valeurs d'exemple pour ce secret : celle que le
#   docker-compose.yml d'auto-hebergement ecrivait en dur jusqu'en novembre
#   2026, celle de .env.example, celles de la documentation. Le compose ne
#   lisait pas le .env : une instance pouvait tourner avec la valeur en dur
#   alors que son .env en contenait une bonne. Une instance qui tourne avec
#   l'une de ces valeurs n'a pas de secret.
#
#   CRON_SECRET ouvre les routes /api/cron/* : purges, envois de rappels,
#   lancement des campagnes. Meme raisonnement.
#
#   Un service qui repond avec un secret public est pire qu'un service qui
#   refuse de demarrer.
#
# CE QUI EST REFUSE
#
#   AUTH_SECRET vide, de moins de 16 caracteres (en dessous, le code de
#   l'application refuse deja de chiffrer et de signer), ou egal a une valeur
#   d'exemple publiee. CRON_SECRET egal a sa valeur d'exemple publiee ; vide,
#   il est accepte, puisque les routes cron refusent alors tout appel.
#
#   Aucune exception pour DEMO_MODE=true : scripts/start.sh genere un secret
#   aleatoire, une demonstration n'a pas besoin d'un secret connu de tous.
#
# LA COMPARAISON EST EXACTE, valeur par valeur
#
#   Chercher des motifs (« change-me », « remplace ») finirait par refuser un
#   vrai secret, et changer AUTH_SECRET sur une instance qui a servi n'est pas
#   gratuit : cf. docs/upgrade.md. On ne refuse que ce qu'on sait public.
#
# QUE FAIRE EN CAS DE REFUS
#
#   Pas de contournement, et c'est delibere : la correction est de generer une
#   valeur, ce qui tient en une commande.
#
# Uniquement des commandes internes au shell : la garde ne depend d'aucun
# binaire, ni dans l'image ni dans les tests. Elle n'affiche jamais la valeur
# d'un secret, seulement son nom et sa longueur.
# -----------------------------------------------------------------------------
verifier_secrets() {
  refus_auth=""
  refus_cron=""

  case "${AUTH_SECRET:-}" in
    "")
      refus_auth="AUTH_SECRET est vide."
      ;;
    "demo-secret-change-me-in-prod-d3m0-s3cr3t-1234567890" | \
    "REMPLACE_MOI_PAR_UN_SECRET_GENERE_AVEC_OPENSSL_RAND_BASE64_32" | \
    "remplace-moi-par-un-secret-genere" | \
    "...32+ caractères aléatoires base64..." | \
    "Iqx9Ot/tCBmrFqkAcLqxdj9DZpvEBALMqoqW2Bxxxxx=" | \
    "build-time-only-not-a-real-secret")
      refus_auth="AUTH_SECRET est une valeur d'exemple publiee dans le depot : tout le monde la connait."
      ;;
    *)
      if [ "${#AUTH_SECRET}" -lt 16 ]; then
        refus_auth="AUTH_SECRET est trop court : ${#AUTH_SECRET} caracteres, il en faut 16 au moins, 32 de preference."
      fi
      ;;
  esac

  case "${CRON_SECRET:-}" in
    "demo-cron-secret-change-me-32-chars-minimum-pour-prod")
      refus_cron="CRON_SECRET est la valeur d'exemple publiee dans le depot : tout le monde la connait."
      ;;
  esac

  if [ -z "$refus_auth" ] && [ -z "$refus_cron" ]; then
    if [ "${#AUTH_SECRET}" -lt 32 ]; then
      echo "[garde] AVERTISSEMENT : AUTH_SECRET fait ${#AUTH_SECRET} caracteres. 32 au moins sont"
      echo "        recommandes (openssl rand -base64 32). Le demarrage continue."
    fi
    echo "[garde] Secrets : aucune valeur d'exemple."
    return 0
  fi

  {
    echo ""
    echo "  =============================================="
    echo "  DEMARRAGE REFUSE : un secret n'en est pas un."
    echo "  =============================================="
    echo ""
    if [ -n "$refus_auth" ]; then
      echo "  - $refus_auth"
    fi
    if [ -n "$refus_cron" ]; then
      echo "  - $refus_cron"
    fi
    echo ""
    echo "  Corriger : generer une valeur, la poser dans le .env, relancer."
    echo ""
    echo "      openssl rand -base64 32      pour AUTH_SECRET"
    echo "      openssl rand -hex 32         pour CRON_SECRET"
    echo ""
    echo "  Sur une instance qui a deja servi, changer AUTH_SECRET deconnecte"
    echo "  tout le monde et rend illisibles les mots de passe SMTP et CISO"
    echo "  Assistant enregistres : lire docs/upgrade.md avant."
    echo ""
  } >&2
  exit 1
}

# Avant tout le reste, dans les deux modes : une configuration qui ne peut pas
# servir n'a pas non plus a preparer la base, et le refus arrive tout de suite
# au lieu d'attendre Postgres.
verifier_secrets

if [ "$1" = "preparer" ]; then
  attendre_postgres
  preparer_etat_partage
  echo ""
  echo "  Preparation terminee. Le conteneur applicatif peut demarrer."
  exit 0
fi

attendre_postgres

if [ "$HUMANIX_PREPARER_AU_DEMARRAGE" = "false" ]; then
  echo "[preparation] Ignoree : HUMANIX_PREPARER_AU_DEMARRAGE=false."
  echo "              Le schema et les donnees partagees sont supposes deja a jour"
  echo "              (cf. l'etape de preparation de scripts/deploy.sh)."
  # « Supposes » ne suffit pas : on verifie.
  verifier_schema
else
  preparer_etat_partage
fi

# L'URL annoncee suit la configuration au lieu de la supposer.
#
# Cette ligne disait « /demo » EN TOUTES CIRCONSTANCES, production comprise.
# C'est la premiere chose qu'on lit dans les journaux d'un conteneur, et un
# journal de production qui se presente comme la demo trompe celui qui le lit
# sous pression. Meme famille que le docker-compose.yml de prod derive du
# gabarit de la demo.
#
# `if` explicite et non `[ ... ] && ...` : sous `set -e`, un test faux en tete
# d'une liste && fait sortir le script.
BASE_AFFICHEE="${NEXT_PUBLIC_APP_URL:-${AUTH_URL:-http://localhost:3000}}"
BASE_AFFICHEE="${BASE_AFFICHEE%/}"
if [ "$DEMO_MODE" = "true" ]; then
  BASE_AFFICHEE="$BASE_AFFICHEE/demo"
fi

echo ""
echo "  =============================================="
echo "  Pret. Ouvre $BASE_AFFICHEE"
echo "  =============================================="
echo ""

# Demarrage Next.js
exec ./node_modules/.bin/next start -H 0.0.0.0 -p 3000
