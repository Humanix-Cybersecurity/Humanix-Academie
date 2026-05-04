// Templates PDF des documents de reponse a incident.
// Tous bases sur Helvetica (pas d'emojis - cf. convention etablie pour les
// PDF dans lib/pdf-audit-flash.tsx).
//
// Templates fournis :
//   - notification-cnil  : RGPD art. 33 (violation de DCP)
//   - notification-anssi : NIS2 (incident significatif)
//   - communication-interne : brief equipe
//   - communication-externe : brief clients/partenaires
//   - information-personnes : RGPD art. 34 (information directe)

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  type DocumentProps,
} from "@react-pdf/renderer";
import type { IncidentResponse, Tenant } from "@prisma/client";
import { INCIDENT_TYPE_LABELS } from "./playbooks";

// Element strict accepte par renderToBuffer (un <Document> directement).
type DocumentElement = React.ReactElement<DocumentProps>;

const COLORS = {
  primary: "#0B3D91",
  warn: "#C0392B",
  amber: "#F59E0B",
  gray: "#555555",
  light: "#EAF3F8",
  cream: "#FFF8E5",
};

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1A1A1A",
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 24,
    borderBottom: "2pt solid #0B3D91",
    paddingBottom: 12,
  },
  brand: { fontSize: 16, fontWeight: "bold", color: COLORS.primary },
  docTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.primary,
    marginTop: 14,
    marginBottom: 18,
  },
  meta: { fontSize: 9, color: COLORS.gray, marginBottom: 20 },
  h2: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.primary,
    marginTop: 18,
    marginBottom: 6,
  },
  p: { marginBottom: 8 },
  table: { marginVertical: 8, border: "1pt solid #DDD", borderRadius: 3 },
  row: { flexDirection: "row", borderBottom: "0.5pt solid #DDD" },
  rowLast: { flexDirection: "row" },
  cellLabel: {
    width: 160,
    padding: 6,
    fontWeight: "bold",
    backgroundColor: "#F8F9FA",
    fontSize: 10,
  },
  cellValue: { flex: 1, padding: 6, fontSize: 10 },
  warningBox: {
    backgroundColor: COLORS.cream,
    borderLeft: `3pt solid ${COLORS.amber}`,
    padding: 10,
    marginVertical: 12,
    fontSize: 10,
  },
  signature: { marginTop: 30, fontSize: 10 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 50,
    right: 50,
    fontSize: 8,
    color: COLORS.gray,
    borderTop: "0.5pt solid #DDDDDD",
    paddingTop: 6,
    textAlign: "center",
  },
});

type DocProps = {
  incident: IncidentResponse;
  tenant: Tenant;
  generatedAt: Date;
};

function formatDateLong(d: Date): string {
  return d.toLocaleDateString("fr-FR", { dateStyle: "long" } as any);
}

function MetaTable({
  tenant,
  incident,
}: {
  tenant: Tenant;
  incident: IncidentResponse;
}) {
  const typeMeta = INCIDENT_TYPE_LABELS[incident.type];
  return (
    <View style={styles.table}>
      <View style={styles.row}>
        <Text style={styles.cellLabel}>Organisation</Text>
        <Text style={styles.cellValue}>{tenant.name}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.cellLabel}>Référence interne</Text>
        <Text style={styles.cellValue}>{incident.reference}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.cellLabel}>Date de détection</Text>
        <Text style={styles.cellValue}>
          {formatDateLong(incident.detectedAt)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.cellLabel}>Type d'incident</Text>
        <Text style={styles.cellValue}>{typeMeta.label}</Text>
      </View>
      <View style={styles.rowLast}>
        <Text style={styles.cellLabel}>Sévérité</Text>
        <Text style={styles.cellValue}>{incident.severity}</Text>
      </View>
    </View>
  );
}

function Footer({ generatedAt }: { generatedAt: Date }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        Document généré par Humanix Académie — {generatedAt.toISOString()} —
        Document de travail à valider par votre RSSI/DPO avant envoi.
      </Text>
    </View>
  );
}

// ===========================================================================
// 1. NOTIFICATION CNIL (RGPD ART. 33)
// ===========================================================================
export function NotificationCnilDoc({
  incident,
  tenant,
  generatedAt,
}: DocProps): DocumentElement {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            Humanix Académie — Module Cyber-Réflexe
          </Text>
        </View>

        <Text style={styles.docTitle}>
          Notification de violation de données à caractère personnel
        </Text>
        <Text style={styles.meta}>
          Article 33 du RGPD — À déposer sur https://notifications.cnil.fr
        </Text>

        <View style={styles.warningBox}>
          <Text>
            ATTENTION : Ce document est un brouillon généré automatiquement. La
            notification CNIL doit être déposée via le téléservice CNIL. Ce
            document sert de support de préparation et d'archivage interne.
          </Text>
        </View>

        <Text style={styles.h2}>1. Identification de l'organisme</Text>
        <MetaTable tenant={tenant} incident={incident} />

        <Text style={styles.h2}>2. Description de la violation</Text>
        <Text style={styles.p}>{incident.description}</Text>

        <Text style={styles.h2}>3. Catégories de données concernées</Text>
        <Text style={styles.p}>
          {incident.dataConcerned ??
            "À COMPLÉTER : nature des données personnelles touchées (état civil, contact, données sensibles, données bancaires, identifiants, etc.)."}
        </Text>

        <Text style={styles.h2}>
          4. Nombre approximatif de personnes concernées
        </Text>
        <Text style={styles.p}>
          {incident.affectedUsers
            ? `${incident.affectedUsers} personnes`
            : "À COMPLÉTER : estimation à fournir."}
        </Text>

        <Text style={styles.h2}>5. Conséquences probables de la violation</Text>
        <Text style={styles.p}>
          À COMPLÉTER : risque de phishing ciblé, usurpation d'identité,
          atteinte à la vie privée, préjudice financier, atteinte à la
          réputation, etc.
        </Text>

        <Text style={styles.h2}>6. Mesures prises ou envisagées</Text>
        <Text style={styles.p}>
          {incident.affectedSystems
            ? `Systèmes concernés : ${incident.affectedSystems}.\n\n`
            : ""}
          À COMPLÉTER : mesures de confinement, mesures correctives techniques,
          information des personnes, plan d'action 30/60/90 jours, etc.
        </Text>

        <Text style={styles.h2}>7. Contact DPO / référent</Text>
        <Text style={styles.p}>
          À COMPLÉTER : nom, fonction, email, téléphone du DPO ou du référent
          pour la CNIL.
        </Text>

        <View style={styles.signature}>
          <Text>
            Fait à _____________________, le {formatDateLong(generatedAt)}
          </Text>
          <Text>Signature : _____________________</Text>
        </View>

        <Footer generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}

// ===========================================================================
// 2. NOTIFICATION ANSSI (NIS2)
// ===========================================================================
export function NotificationAnssiDoc({
  incident,
  tenant,
  generatedAt,
}: DocProps): DocumentElement {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            Humanix Académie — Module Cyber-Réflexe
          </Text>
        </View>

        <Text style={styles.docTitle}>
          Notification d'incident significatif (NIS2)
        </Text>
        <Text style={styles.meta}>
          Directive NIS2 — Téléservice ANSSI :
          https://www.cert.ssi.gouv.fr/incident/
        </Text>

        <View style={styles.warningBox}>
          <Text>
            La directive NIS2 impose : (a) une alerte précoce sous 24h, (b) une
            notification d'incident sous 72h, (c) un rapport final sous 1 mois.
            Ce document peut être joint à votre déclaration.
          </Text>
        </View>

        <Text style={styles.h2}>1. Entité notificatrice</Text>
        <MetaTable tenant={tenant} incident={incident} />

        <Text style={styles.h2}>2. Nature de l'incident</Text>
        <Text style={styles.p}>{incident.description}</Text>

        <Text style={styles.h2}>3. Impact opérationnel</Text>
        <Text style={styles.p}>
          {incident.affectedSystems
            ? `Systèmes / services affectés : ${incident.affectedSystems}.`
            : "À COMPLÉTER : services affectés, indisponibilité, durée."}
        </Text>

        <Text style={styles.h2}>4. Cause racine identifiée (si connue)</Text>
        <Text style={styles.p}>
          {incident.rootCause ?? "À COMPLÉTER ou « en cours d'analyse »."}
        </Text>

        <Text style={styles.h2}>5. Mesures de réponse engagées</Text>
        <Text style={styles.p}>
          À COMPLÉTER : confinement, restauration, communication, recours à un
          prestataire de réponse à incident (PRIS).
        </Text>

        <Text style={styles.h2}>6. Impact transfrontalier potentiel</Text>
        <Text style={styles.p}>
          À COMPLÉTER : oui/non. Si oui, États membres concernés.
        </Text>

        <View style={styles.signature}>
          <Text>
            Fait à _____________________, le {formatDateLong(generatedAt)}
          </Text>
          <Text>Nom et fonction du déclarant : _____________________</Text>
        </View>

        <Footer generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}

// ===========================================================================
// 3. COMMUNICATION INTERNE (BRIEF EQUIPE)
// ===========================================================================
export function CommunicationInterneDoc({
  incident,
  tenant,
  generatedAt,
}: DocProps): DocumentElement {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            Humanix Académie — Module Cyber-Réflexe
          </Text>
        </View>

        <Text style={styles.docTitle}>
          Communication interne — incident en cours
        </Text>
        <Text style={styles.meta}>
          Modèle de message à diffuser aux collaborateurs. À adapter au ton de
          votre entreprise. Principe : factuel, transparent, sans alarmer.
        </Text>

        <Text style={styles.h2}>Objet de l'email</Text>
        <Text style={styles.p}>
          [Important] Information cybersécurité — Action requise
        </Text>

        <Text style={styles.h2}>Corps du message</Text>
        <Text style={styles.p}>Bonjour à toutes et à tous,</Text>
        <Text style={styles.p}>
          Nous tenons à vous informer qu'un incident de sécurité a été détecté
          le {formatDateLong(incident.detectedAt)} concernant {tenant.name}.
        </Text>
        <Text style={styles.p}>
          Nature de l'incident : {INCIDENT_TYPE_LABELS[incident.type].label}.
        </Text>
        <Text style={styles.p}>
          Notre équipe IT et nos prestataires sont mobilisés pour résoudre la
          situation. Aucune information confidentielle ne nous est connue comme
          étant exposée à ce stade.
        </Text>
        <Text style={styles.h2}>Ce que nous vous demandons</Text>
        <Text style={styles.p}>
          1.{" "}
          {incident.affectedSystems
            ? `Ne plus utiliser temporairement : ${incident.affectedSystems}.`
            : "Suivre les consignes spécifiques qui vous seront communiquées par votre manager."}
        </Text>
        <Text style={styles.p}>
          2. Signaler IMMÉDIATEMENT tout email, appel téléphonique ou
          comportement suspect à votre référent cybersécurité.
        </Text>
        <Text style={styles.p}>
          3. Ne PAS communiquer sur cet incident en dehors de l'entreprise
          (réseaux sociaux, presse, partenaires) sans accord préalable de la
          direction.
        </Text>
        <Text style={styles.h2}>Pour toute question</Text>
        <Text style={styles.p}>
          Contactez : __________________ (référent cyber désigné)
        </Text>
        <Text style={styles.p}>
          Merci pour votre coopération et votre vigilance.
        </Text>

        <View style={styles.signature}>
          <Text>{tenant.name}</Text>
          <Text>Direction</Text>
        </View>

        <Footer generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}

// ===========================================================================
// 4. COMMUNICATION EXTERNE (CLIENTS / PARTENAIRES)
// ===========================================================================
export function CommunicationExterneDoc({
  incident,
  tenant,
  generatedAt,
}: DocProps): DocumentElement {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            Humanix Académie — Module Cyber-Réflexe
          </Text>
        </View>

        <Text style={styles.docTitle}>
          Communication externe — clients et partenaires
        </Text>
        <Text style={styles.meta}>
          Modèle à adapter. Principe : transparence, sans excès. Mentionner les
          actions correctives. Désigner UN seul porte-parole.
        </Text>

        <Text style={styles.h2}>Madame, Monsieur,</Text>
        <Text style={styles.p}>
          Nous tenons à vous informer qu'un incident de sécurité a affecté nos
          systèmes le {formatDateLong(incident.detectedAt)}. Nous traitons cette
          situation avec la plus grande rigueur et en toute transparence.
        </Text>

        <Text style={styles.h2}>Ce qui s'est passé</Text>
        <Text style={styles.p}>{incident.description}</Text>

        <Text style={styles.h2}>L'impact pour vous</Text>
        <Text style={styles.p}>
          À COMPLÉTER : préciser si les données du destinataire sont concernées
          ou non, et le cas échéant, quelles données et quels risques.
        </Text>

        <Text style={styles.h2}>Les mesures prises</Text>
        <Text style={styles.p}>Nous avons immédiatement :</Text>
        <Text style={styles.p}>- Isolé les systèmes concernés ;</Text>
        <Text style={styles.p}>
          - Mobilisé une équipe d'experts pour analyser et corriger ;
        </Text>
        <Text style={styles.p}>
          - Engagé les notifications légales (CNIL, autorités) ;
        </Text>
        <Text style={styles.p}>- Renforcé nos mesures de sécurité.</Text>

        <Text style={styles.h2}>Nos recommandations</Text>
        <Text style={styles.p}>
          À COMPLÉTER : recommandations spécifiques au destinataire (changer son
          mot de passe, vérifier ses relevés bancaires, signaler les phishings,
          etc.).
        </Text>

        <Text style={styles.h2}>Pour nous contacter</Text>
        <Text style={styles.p}>
          Notre équipe se tient à votre disposition : __________________
          (porte-parole unique désigné).
        </Text>

        <View style={styles.signature}>
          <Text>Cordialement,</Text>
          <Text>{tenant.name}</Text>
        </View>

        <Footer generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}

// ===========================================================================
// 5. INFORMATION DIRECTE AUX PERSONNES (RGPD ART. 34)
// ===========================================================================
export function InformationPersonnesDoc({
  incident,
  tenant,
  generatedAt,
}: DocProps): DocumentElement {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            Humanix Académie — Module Cyber-Réflexe
          </Text>
        </View>

        <Text style={styles.docTitle}>
          Information aux personnes concernées
        </Text>
        <Text style={styles.meta}>
          Article 34 du RGPD — Obligatoire si la violation présente un risque
          ÉLEVÉ pour les droits et libertés des personnes.
        </Text>

        <Text style={styles.p}>Madame, Monsieur,</Text>
        <Text style={styles.p}>
          {tenant.name} a été victime d'un incident de sécurité le{" "}
          {formatDateLong(incident.detectedAt)}. Conformément à la
          réglementation européenne sur la protection des données (RGPD), nous
          avons l'obligation de vous en informer.
        </Text>

        <Text style={styles.h2}>Qu'est-ce qui s'est passé ?</Text>
        <Text style={styles.p}>{incident.description}</Text>

        <Text style={styles.h2}>Quelles données vous concernant ?</Text>
        <Text style={styles.p}>
          {incident.dataConcerned ??
            "À COMPLÉTER : préciser EXACTEMENT quelles données vous concernant ont été touchées."}
        </Text>

        <Text style={styles.h2}>Quels risques pour vous ?</Text>
        <Text style={styles.p}>
          À COMPLÉTER : risque de phishing, d'usurpation, de fraude, etc.
        </Text>

        <Text style={styles.h2}>Que vous recommandons-nous ?</Text>
        <Text style={styles.p}>
          À COMPLÉTER : changer vos mots de passe sur tous les services où vous
          utilisez le même, surveiller vos relevés bancaires, ne pas répondre à
          des emails ou appels prétendant provenir de nous, etc.
        </Text>

        <Text style={styles.h2}>Vos droits</Text>
        <Text style={styles.p}>
          Vous disposez d'un droit d'accès, de rectification, d'effacement et
          d'opposition sur vos données. Pour les exercer, contactez notre DPO :
          __________________.
        </Text>
        <Text style={styles.p}>
          Vous pouvez également déposer une réclamation auprès de la CNIL :
          https://www.cnil.fr/plaintes
        </Text>

        <View style={styles.signature}>
          <Text>Le délégué à la protection des données</Text>
          <Text>{tenant.name}</Text>
        </View>

        <Footer generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}

// ===========================================================================
// AGGREGATEUR
// ===========================================================================
// On type le composant comme une fonction synchrone retournant un
// ReactElement<DocumentProps> strict (et non React.FC qui en React 19
// autorise les composants async -> ReactNode | Promise<ReactNode>, et pas
// React.ReactElement generique qui perd l'info DocumentProps requise par
// renderToBuffer).
export type IncidentDocComponent = (props: DocProps) => DocumentElement;

export const DOCUMENT_REGISTRY: Record<
  string,
  {
    label: string;
    description: string;
    component: IncidentDocComponent;
  }
> = {
  "notification-cnil": {
    label: "Notification CNIL (RGPD art. 33)",
    description:
      "Brouillon pour le téléservice CNIL en cas de violation de DCP.",
    component: NotificationCnilDoc,
  },
  "notification-anssi": {
    label: "Notification ANSSI (NIS2)",
    description: "Brouillon pour la déclaration d'incident NIS2.",
    component: NotificationAnssiDoc,
  },
  "communication-interne": {
    label: "Communication interne (équipe)",
    description: "Brief à diffuser aux collaborateurs pour cadrer le message.",
    component: CommunicationInterneDoc,
  },
  "communication-externe": {
    label: "Communication externe (clients/partenaires)",
    description: "Brief à diffuser aux parties prenantes externes.",
    component: CommunicationExterneDoc,
  },
  "information-personnes": {
    label: "Information aux personnes (RGPD art. 34)",
    description: "Information directe aux personnes concernées (risque élevé).",
    component: InformationPersonnesDoc,
  },
};
