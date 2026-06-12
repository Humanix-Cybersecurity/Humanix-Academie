// SPDX-License-Identifier: AGPL-3.0-or-later
// Certificat de completion individuel - version 1 page, encadrable.
//
// EVOLUTIONS V2 :
//  - Sortie sur 1 page A4 paysage uniquement (pas de listing modules)
//  - Logo Humanix Académie en filigrane transparent au centre (chroma key
//    déjà fait sur le PNG public/logo-humanix-academie-512.png)
//  - Suppression du "H" stylisé en haut (le logo en filigrane le remplace)
//  - Mise en page épurée, esthétique "à encadrer"
import fs from "node:fs";
import path from "node:path";
import React from "react";
import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const COLORS = {
  primary: "#0B3D91",
  accent: "#00A3A1",
  amber: "#F59E0B",
  gray: "#555555",
  light: "#EAF3F8",
};

// Resolution robuste du logo : Next 15+ standalone copie public/ a cote du
// server.js, mais cwd peut varier selon le launcher. On essaie 2 paths
// scopes au sous-dossier "public" (Turbopack NFT trace correctement les
// chemins statiquement scopes a un sous-dossier connu). Si aucun ne
// resout, le filigrane est omis (le certificat reste lisible).
//
// Lazy + cache : on calcule a la 1ere demande (runtime), pas au import
// du module. Cela evite a Turbopack de declencher la trace NFT au build
// (warning "Encountered unexpected file in NFT list").
let cachedLogoPath: string | null | undefined;

function getLogoPath(): string | null {
  if (cachedLogoPath !== undefined) return cachedLogoPath;
  // L'annotation /* turbopackIgnore: true */ sur process.cwd() dit a
  // Turbopack de ne pas tracer ce sous-arbre lors du build NFT (sinon
  // il y a un warning "Encountered unexpected file in NFT list" — le
  // chemin etant resolu seulement au runtime, le tracing build-time
  // n'apporte rien).
  const candidates = [
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "public",
      "logo-humanix-academie-512.png",
    ),
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      ".next",
      "standalone",
      "public",
      "logo-humanix-academie-512.png",
    ),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        cachedLogoPath = p;
        return p;
      }
    } catch {
      // ignore
    }
  }
  cachedLogoPath = null;
  return null;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1A1A1A",
    position: "relative",
  },
  // Filigrane logo : centre la page, opacite tres faible pour ne pas voler la
  // vedette au texte mais visible a l'oeil. La taille est volontairement
  // grande (~70% de la page A4 paysage).
  watermark: {
    position: "absolute",
    top: 80,
    left: 230,
    width: 380,
    height: 380,
    opacity: 0.06,
  },
  border: {
    flex: 1,
    border: `4pt double ${COLORS.primary}`,
    padding: 24,
    position: "relative",
  },
  innerBorder: {
    flex: 1,
    border: `1pt solid ${COLORS.accent}`,
    padding: 20,
    justifyContent: "space-between",
  },
  // BLOC HAUT : marque
  brandName: {
    fontSize: 13,
    color: COLORS.primary,
    textAlign: "center",
    fontWeight: "bold",
    letterSpacing: 3,
    marginTop: 4,
  },
  brandTagline: {
    fontSize: 8,
    color: COLORS.gray,
    textAlign: "center",
    letterSpacing: 1.5,
    marginTop: 2,
    textTransform: "uppercase",
  },
  // BLOC CENTRE : titre + nom
  certificateTitle: {
    fontSize: 38,
    color: COLORS.primary,
    textAlign: "center",
    fontWeight: "bold",
    marginTop: 18,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 24,
  },
  awardLabel: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 6,
  },
  recipientName: {
    fontSize: 32,
    color: COLORS.accent,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 18,
    paddingBottom: 10,
    paddingHorizontal: 60,
    marginHorizontal: 40,
    borderBottom: `1pt solid ${COLORS.amber}`,
  },
  body: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 1.6,
    marginBottom: 20,
  },

  // BLOC NIVEAU
  levelBlock: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.light,
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    marginHorizontal: 80,
  },
  levelLabel: { fontSize: 10, color: COLORS.gray, marginRight: 12 },
  levelValue: { fontSize: 14, fontWeight: "bold", color: COLORS.primary },

  // BLOC BAS : signature, date, hash
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 6,
    paddingTop: 16,
    borderTop: `0.5pt solid ${COLORS.gray}`,
  },
  signatureBlock: { flex: 1 },
  signatureBlockRight: { flex: 1, alignItems: "flex-end" },
  signatureLine: {
    fontSize: 9,
    color: COLORS.gray,
  },
  signatureName: {
    fontSize: 11,
    fontWeight: "bold",
    color: COLORS.primary,
    marginTop: 2,
  },
  hash: {
    fontSize: 7,
    color: COLORS.gray,
    fontFamily: "Courier",
    marginTop: 4,
  },
  legalNote: {
    fontSize: 7,
    color: COLORS.gray,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
});

/**
 * Nom a faire figurer sur le certificat.
 *
 * Comportement (a la demande utilisateur, cf. /profil/infos) :
 *   - Si l'utilisateur a renseigne SON prenom ET son nom reels (optionnels),
 *     on les utilise : "Prenom Nom".
 *   - Sinon, on retombe sur le pseudo (`name`) — comportement historique.
 *   - Ultime filet de securite : la partie locale de l'email.
 *
 * On exige les DEUX champs (prenom + nom) pour eviter un certificat a moitie
 * rempli ("Marie " ou " Durand"). Tant que l'un manque, on garde le pseudo.
 */
export function certificateName(user: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  const pseudo = user.name?.trim();
  if (pseudo) return pseudo;
  return user.email ? user.email.split("@")[0] : "";
}

type Props = {
  recipientName: string;
  tenantName: string;
  totalEpisodes: number;
  totalXP: number;
  averageScore: number;
  levelName: string;
  levelId: number;
  // Garde la prop pour la compatibilite avec l'API existante, mais on
  // ne l'affiche plus sur le certificat (V2 = 1 page sans listing).
  modules: { title: string; saisonTitle: string; score: number }[];
  generatedAt: Date;
};

export function CertificateOfCompletion(props: Props) {
  const date = props.generatedAt.toLocaleDateString("fr-FR", {
    dateStyle: "long",
  } as any);
  const hash = computeHash(
    `${props.recipientName}-${props.tenantName}-${props.totalXP}-${props.generatedAt.toISOString()}`,
  );

  // Resolution lazy au moment du rendu (1ere demande). Evite que le
  // module-load ne declenche un fs scan a build time.
  const logoPath = getLogoPath();
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Filigrane : logo Humanix transparent au centre. Sous tous les
            autres elements grace a position absolute + ordre de rendu.
            Omis silencieusement si le fichier n'est pas trouve au runtime. */}
        {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image n'accepte pas la prop alt */}
        {logoPath && <Image src={logoPath} style={styles.watermark} />}

        <View style={styles.border}>
          <View style={styles.innerBorder}>
            {/* Marque (sans le H stylise) */}
            <View>
              <Text style={styles.brandName}>HUMANIX ACADÉMIE</Text>
              <Text style={styles.brandTagline}>
                La cyber humaine pour tous
              </Text>

              <Text style={styles.certificateTitle}>
                Certificat de Sensibilisation Cyber
              </Text>
              <Text style={styles.subtitle}>
                Programme de formation continue à la cybersécurité humaine
              </Text>

              <Text style={styles.awardLabel}>Délivré à</Text>
              <Text style={styles.recipientName}>{props.recipientName}</Text>

              <Text style={styles.body}>
                pour la complétion de {props.totalEpisodes} module
                {props.totalEpisodes > 1 ? "s" : ""} de sensibilisation cyber au
                sein de l'organisation{" "}
                <Text style={{ fontWeight: "bold" }}>{props.tenantName}</Text>.
                {"\n"}
                Score moyen obtenu : {props.averageScore} / 100.
              </Text>

              <View style={styles.levelBlock}>
                <Text style={styles.levelLabel}>Niveau atteint :</Text>
                <Text style={styles.levelValue}>
                  Niveau {props.levelId} · {props.levelName} · {props.totalXP}{" "}
                  XP
                </Text>
              </View>
            </View>

            {/* Bas : signature, date, hash */}
            <View>
              <View style={styles.footer}>
                <View style={styles.signatureBlock}>
                  <Text style={styles.signatureLine}>Émis le</Text>
                  <Text style={styles.signatureName}>{date}</Text>
                </View>
                <View style={styles.signatureBlockRight}>
                  <Text style={styles.signatureLine}>Validé par</Text>
                  <Text style={styles.signatureName}>
                    Humanix-Cybersecurity
                  </Text>
                  <Text style={styles.hash}>SIGNATURE : {hash}</Text>
                </View>
              </View>
              <Text style={styles.legalNote}>
                Ce certificat atteste de l'engagement de la personne nommée dans
                un programme de sensibilisation cyber. Il ne se substitue pas à
                une certification professionnelle de cybersécurité.
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function computeHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return (
    Math.abs(h)
      .toString(16)
      .padStart(12, "0")
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join("-") ?? ""
  );
}
