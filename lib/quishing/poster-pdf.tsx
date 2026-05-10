// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Generation PDF d'affiches quishing - 1 page par destinataire avec
// son QR code unique et le texte d'accroche du template.
//
// Usage : appele depuis /api/admin/quishing/poster/[campaignId]
//
// L'admin telecharge le PDF, l'imprime, le coupe (chaque page = 1
// affiche A4) et colle physiquement les affiches selon le contexte
// du template (parking, cafeteria, panneau RH...).
//
// SOUVERAINETE : QR codes generes localement via la lib npm `qrcode`
// (Reed-Solomon offline, aucun appel reseau). Aucune dependance
// externe a un service tiers.

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
  buildQuishingLandingUrl,
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
  emoji: {
    fontSize: 60,
    marginBottom: 12,
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

export type PosterRecipient = {
  trackToken: string;
  userName: string | null;
  userEmail: string;
};

export type PosterDocProps = {
  templateId: QuishingTemplate;
  recipients: PosterRecipient[];
  /** QR codes pre-generes (un par recipient, dans l'ordre). DataURL PNG. */
  qrDataUrls: string[];
  baseUrl: string;
  campaignId: string;
};

/**
 * Compose le Document PDF react-pdf : 1 page A4 par destinataire.
 * Les QR codes sont passes en props deja-encodes (data URLs) parce que
 * @react-pdf/renderer ne supporte pas les async generators dans les
 * components React.
 */
export function QuishingPosterDoc({
  templateId,
  recipients,
  qrDataUrls,
  baseUrl,
  campaignId,
}: PosterDocProps) {
  const tpl = QUISHING_TEMPLATES[templateId];
  if (!tpl) return null;

  return (
    <Document
      title={`Quishing - ${tpl.name}`}
      author="Humanix Académie"
      creator="Humanix Académie"
      producer="Humanix Académie"
    >
      {recipients.map((r, i) => {
        const qrUrl = qrDataUrls[i];
        const landing = buildQuishingLandingUrl(baseUrl, r.trackToken);
        return (
          <Page key={r.trackToken} size="A4" style={styles.page}>
            {/* Bandeau de coupe - VISIBLE par l'admin, A COUPER */}
            <Text style={styles.cutLine}>
              ✂ Découper ici avant d&apos;afficher · Cible :{" "}
              {r.userName ?? r.userEmail} · Campagne {campaignId.slice(0, 8)}
            </Text>
            <View style={styles.cutLineBorder} />

            {/* AFFICHE - bloc collable */}
            <View style={styles.poster}>
              <Text style={styles.emoji}>{tpl.emoji}</Text>
              <Text style={styles.callout}>{tpl.posterCallout}</Text>
              {qrUrl ? (
                /* eslint-disable-next-line jsx-a11y/alt-text */
                <Image src={qrUrl} style={styles.qrImage} />
              ) : null}
              <Text style={styles.qrInstruction}>
                Scannez ce QR avec votre smartphone pour accéder
              </Text>
            </View>

            {/* Footer interne audit (non visible par la cible apres coupe) */}
            <Text style={styles.internalFooter}>
              [INTERNE] Test pédagogique Humanix Académie · token{" "}
              {r.trackToken.slice(0, 12)}… · landing {landing.slice(0, 60)}
              {landing.length > 60 ? "…" : ""}
            </Text>
          </Page>
        );
      })}
    </Document>
  );
}

/**
 * Helper : encode tous les QR codes pour une campagne. Async.
 */
export async function buildQrDataUrls(
  recipients: PosterRecipient[],
  baseUrl: string,
): Promise<string[]> {
  const urls: string[] = [];
  for (const r of recipients) {
    const landing = buildQuishingLandingUrl(baseUrl, r.trackToken);
    const dataUrl = await buildQrCodeDataUrl(landing, 600);
    urls.push(dataUrl);
  }
  return urls;
}

/**
 * Genere le PDF des affiches en buffer Node prêt a être renvoye en
 * Response. Encapsule les imports JSX qui ne peuvent pas vivre dans un
 * route.ts (Next.js handler).
 */
export async function renderQuishingPosterBuffer(opts: {
  templateId: QuishingTemplate;
  recipients: PosterRecipient[];
  baseUrl: string;
  campaignId: string;
}): Promise<Buffer> {
  const qrDataUrls = await buildQrDataUrls(opts.recipients, opts.baseUrl);
  return renderToBuffer(
    <QuishingPosterDoc
      templateId={opts.templateId}
      recipients={opts.recipients}
      qrDataUrls={qrDataUrls}
      baseUrl={opts.baseUrl}
      campaignId={opts.campaignId}
    />,
  );
}
