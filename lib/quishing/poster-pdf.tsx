// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Generation PDF d'affiches quishing - UNE page unique a imprimer puis
// dupliquer / coller dans les contextes adequats (parking, cafeteria,
// panneau RH...). Avant mai 2026 : on generait 1 page par destinataire
// avec un QR unique. Refonte : 1 seule page, 1 QR commun a la campagne.
//
// POURQUOI 1 PAGE ?
//   - Une affiche physique se duplique a la photocopieuse, pas 19 fois
//     dans le PDF.
//   - Le tracking "qui a scanne" perd de toute facon son sens en physique
//     (plusieurs personnes passent devant le meme poster). On track
//     plutot "combien de scans" au niveau de la campagne.
//   - Si la cible est authentifiee lors du scan, on l'attribue a son
//     PhishingResult (cf. app/phishing/[token]/page.tsx, branche qhc_).
//
// LOGO ENTREPRISE :
//   L'admin peut uploader un logo qui s'affiche en haut de l'affiche.
//   Le logo n'est JAMAIS stocke en BDD ni sur disque : il transite en
//   memoire dans le request, est encode base64 pour @react-pdf/renderer,
//   et disparait apres generation. Aucun logo = espace vide (pas de
//   logo Humanix par defaut, qui serait off-brand pour la campagne).
//
// SOUVERAINETE : QR codes generes localement via la lib npm `qrcode`
// (Reed-Solomon offline, aucun appel reseau).

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  QUISHING_TEMPLATES,
  type QuishingTemplate,
  buildQrCodeDataUrl,
  buildQuishingCampaignLandingUrl,
  resolvePosterCallout,
} from "@/lib/phishing/qr-code";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    flexDirection: "column",
  },
  // Bandeau "Affiche piège - exercice" en HAUT du PDF (visible par
  // l'admin imprimant, mais qu'il DOIT couper avant de coller)
  cutLine: {
    fontSize: 8,
    color: "#999999",
    textAlign: "center",
    marginBottom: 4,
    fontStyle: "italic",
  },
  cutLineBorder: {
    borderBottom: "1pt dashed #999999",
    marginBottom: 16,
  },
  // Bloc affiche (zone reellement collee)
  poster: {
    flex: 1,
    border: "2pt solid #000000",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  // Logo entreprise (optionnel). Cadre fixe : si pas de logo on laisse
  // l'espace vide pour preserver la composition. Hauteur bornee : on
  // veut un logo, pas un placard.
  logoSlot: {
    height: 80,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    maxHeight: 80,
    maxWidth: 260,
    objectFit: "contain",
  },
  callout: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 1.4,
  },
  qrImage: {
    width: 280,
    height: 280,
    marginVertical: 16,
  },
  qrInstruction: {
    fontSize: 11,
    color: "#333333",
    textAlign: "center",
    marginTop: 8,
  },
  // Footer pour audit interne (pas pour le destinataire)
  internalFooter: {
    marginTop: 24,
    fontSize: 7,
    color: "#cccccc",
    textAlign: "center",
    fontStyle: "italic",
  },
});

export type PosterDocProps = {
  templateId: QuishingTemplate;
  /** QR code pre-genere (data URL PNG) pointant vers /phishing/qhc_<id>. */
  qrDataUrl: string;
  /** URL de landing encodee dans le QR (pour le footer audit). */
  landingUrl: string;
  campaignId: string;
  /**
   * Logo entreprise en data URL (data:image/png;base64,...) ou null.
   * Si null : pas de logo affiche (PAS de logo Humanix par defaut —
   * l'affiche doit pouvoir passer pour un document de l'entreprise).
   */
  logoDataUrl: string | null;
  /**
   * SSID Wi-Fi custom pour le template QR_FAKE_WIFI. Doit avoir ete VALIDE
   * en amont (lib/quishing/ssid-validation.ts). Si null/undefined ou si le
   * template n'est pas WIFI, le callout par defaut est utilise.
   */
  wifiSsid?: string | null;
};

/**
 * Compose le Document PDF react-pdf : 1 SEULE page A4 a imprimer puis
 * dupliquer pour coller dans differents lieux physiques.
 */
export function QuishingPosterDoc({
  templateId,
  qrDataUrl,
  landingUrl,
  campaignId,
  logoDataUrl,
  wifiSsid,
}: PosterDocProps) {
  const tpl = QUISHING_TEMPLATES[templateId];
  if (!tpl) return null;
  // Resout le callout avec les variables custom (SSID Wi-Fi en l'occurrence).
  // Le SSID a deja ete valide cote server avant d'arriver ici.
  const callout = resolvePosterCallout(templateId, { wifiSsid });

  return (
    <Document
      title={`Quishing - ${tpl.name}`}
      author="Humanix Académie"
      creator="Humanix Académie"
      producer="Humanix Académie"
    >
      <Page size="A4" style={styles.page}>
        {/* Bandeau de coupe - VISIBLE par l'admin, A COUPER */}
        <Text style={styles.cutLine}>
          ✂ Découper ici avant d&apos;afficher · Campagne{" "}
          {campaignId.slice(0, 8)}
        </Text>
        <View style={styles.cutLineBorder} />

        {/* AFFICHE - bloc collable */}
        <View style={styles.poster}>
          {/* Slot logo entreprise. Hauteur fixe : si pas de logo,
              espace vide preserve pour la composition. */}
          <View style={styles.logoSlot}>
            {logoDataUrl ? (
              /* eslint-disable-next-line jsx-a11y/alt-text */
              <Image src={logoDataUrl} style={styles.logo} />
            ) : null}
          </View>

          <Text style={styles.callout}>{callout}</Text>
          {qrDataUrl ? (
            /* eslint-disable-next-line jsx-a11y/alt-text */
            <Image src={qrDataUrl} style={styles.qrImage} />
          ) : null}
          <Text style={styles.qrInstruction}>
            Scannez ce QR avec votre smartphone pour accéder
          </Text>
        </View>

        {/* Footer interne audit (non visible par la cible apres coupe) */}
        <Text style={styles.internalFooter}>
          [INTERNE] Test pédagogique Humanix Académie · landing{" "}
          {landingUrl.slice(0, 60)}
          {landingUrl.length > 60 ? "…" : ""}
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Genere le PDF de l'affiche en buffer Node pret a etre renvoye en
 * Response. Encapsule les imports JSX qui ne peuvent pas vivre dans
 * un route.ts (Next.js handler).
 */
export async function renderQuishingPosterBuffer(opts: {
  templateId: QuishingTemplate;
  baseUrl: string;
  campaignId: string;
  /** Optionnel — data URL d'un logo entreprise a embarquer dans le PDF. */
  logoDataUrl: string | null;
  /**
   * SSID Wi-Fi custom (uniquement utile si templateId = QR_FAKE_WIFI).
   * Doit avoir ete VALIDE en amont par validateWifiSsid().
   */
  wifiSsid?: string | null;
}): Promise<Buffer> {
  const landingUrl = buildQuishingCampaignLandingUrl(
    opts.baseUrl,
    opts.campaignId,
  );
  const qrDataUrl = await buildQrCodeDataUrl(landingUrl, 600);
  return renderToBuffer(
    <QuishingPosterDoc
      templateId={opts.templateId}
      qrDataUrl={qrDataUrl}
      landingUrl={landingUrl}
      campaignId={opts.campaignId}
      logoDataUrl={opts.logoDataUrl}
      wifiSsid={opts.wifiSsid}
    />,
  );
}
