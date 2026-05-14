// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Generateur PDF d'une evidence Humanix pour upload comme attachment dans
// CISO Assistant. Format audit-ready ISO 27001 §7.5.
//
// Structure :
//   - Page 1 : couverture + metadonnees audit (controle, owner, periode,
//              version contenu, expiry)
//   - Page 1 (suite) : donnees Humanix (score, statut, artifacts)
//   - Page 2 : MANIFESTE D'INTEGRITE
//              - Payload signe (JSON canonical, contenu textuel + meta)
//              - Algorithme Ed25519, fingerprint pubkey, signature base64url
//              - Procedure de verification offline (openssl)
//
// La signature porte sur le PAYLOAD JSON canonical, pas sur le PDF binaire.
// Raisonnement :
//   - PDF binaire = inclut la signature elle-meme = chicken-and-egg
//   - JSON canonical = stable, portable, verifiable sans Humanix runtime
//   - Procedure verif documentee dans le PDF lui-meme (openssl dgst -verify)
//   - Un auditeur peut re-derouler la verification 5 ans plus tard meme
//     si l'instance Humanix qui a emis la preuve a disparu.

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { signPdfBuffer, type PdfSignature } from "./pdf-signing";

/**
 * Serialise un payload JSON de maniere deterministe :
 *   - cles triees alphabetiquement A TOUS LES NIVEAUX (recursif)
 *   - pas d'espaces inutiles
 *   - arrays preservent leur ordre original
 *
 * Necessaire pour la signature Ed25519 : l'auditeur qui revérifie 5 ans
 * apres doit produire EXACTEMENT le meme JSON byte-par-byte, peu importe
 * la version Node ou la machine.
 */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return (
      "{" +
      entries
        .map(([k, v]) => JSON.stringify(k) + ":" + canonicalJson(v))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}
import type { CisoEvidence } from "./build-bundle";
import type { EvidenceAuditMeta } from "./client";

const COLORS = {
  primary: "#0B3D91",
  accent: "#00A3A1",
  success: "#2E8B57",
  warn: "#F59E0B",
  danger: "#C0392B",
  gray: "#555555",
  light: "#EAF3F8",
  mono: "#2c3e50",
};

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1A1A1A",
  },
  header: {
    borderBottom: "1pt solid #0B3D91",
    paddingBottom: 8,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: { fontSize: 11, color: COLORS.primary, fontWeight: "bold" },
  brandSub: { fontSize: 8, color: COLORS.gray, marginTop: 2 },
  badge: {
    fontSize: 8,
    backgroundColor: COLORS.light,
    color: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },

  title: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: "bold",
    marginBottom: 14,
  },

  section: { marginTop: 14, marginBottom: 6 },
  sectionH: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "bold",
    marginBottom: 6,
    borderBottom: "0.5pt solid #d0d7de",
    paddingBottom: 2,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 150,
    color: COLORS.gray,
    fontSize: 9,
  },
  value: { flex: 1, fontSize: 10, color: "#1A1A1A" },
  valueMono: {
    flex: 1,
    fontSize: 9,
    color: COLORS.mono,
    fontFamily: "Courier",
  },
  statusBadge: {
    alignSelf: "flex-start",
    fontSize: 9,
    fontWeight: "bold",
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },

  manifestBlock: {
    backgroundColor: "#F6F8FA",
    border: "0.5pt solid #d0d7de",
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
  },
  manifestKey: {
    fontSize: 9,
    color: COLORS.gray,
    marginTop: 6,
  },
  manifestVal: {
    fontSize: 8,
    color: COLORS.mono,
    fontFamily: "Courier",
    marginTop: 1,
  },
  smallNote: {
    fontSize: 8,
    color: COLORS.gray,
    fontStyle: "italic",
    marginTop: 10,
  },

  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    fontSize: 7,
    color: COLORS.gray,
    textAlign: "center",
    borderTop: "0.5pt solid #d0d7de",
    paddingTop: 6,
  },
});

function statusColor(status: string): string {
  if (status === "compliant") return COLORS.success;
  if (status === "partial") return COLORS.warn;
  if (status === "non_compliant") return COLORS.danger;
  return COLORS.gray;
}

type PdfPayload = {
  schema: "humanix-evidence-v1";
  tenant: { id: string; name: string };
  framework: string;
  control: { ref: string; name: string };
  audit: EvidenceAuditMeta;
  humanix: {
    status: string;
    score: number | null;
    artifacts: { type: string; name: string; url?: string }[];
  };
};

function buildPayload(
  evidence: CisoEvidence,
  tenant: { id: string; name: string },
  framework: string,
  audit: EvidenceAuditMeta,
): PdfPayload {
  return {
    schema: "humanix-evidence-v1",
    tenant,
    framework,
    control: { ref: evidence.control_ref, name: evidence.control_name },
    audit,
    humanix: {
      status: evidence.status,
      score: evidence.score ?? null,
      artifacts: evidence.artifacts.map((a) => ({
        type: a.type,
        name: a.name,
        ...(a.url && { url: a.url }),
      })),
    },
  };
}

function EvidenceDoc({
  evidence,
  tenant,
  framework,
  audit,
  payload,
  signature,
}: {
  evidence: CisoEvidence;
  tenant: { id: string; name: string };
  framework: string;
  audit: EvidenceAuditMeta;
  payload: PdfPayload;
  signature: PdfSignature;
}) {
  const generatedAt = new Date().toISOString();
  return (
    <Document
      title={`Humanix · ${evidence.control_ref} · ${evidence.control_name}`}
      author="Humanix Académie"
      subject={`Preuve de conformité ${framework} · ${evidence.control_ref}`}
      keywords={`humanix,ciso-assistant,${framework},${evidence.control_ref},audit`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Humanix Académie</Text>
            <Text style={styles.brandSub}>
              Preuve de conformité — Sensibilisation cyber
            </Text>
          </View>
          <Text style={styles.badge}>{framework}</Text>
        </View>

        <Text style={styles.title}>
          Preuve · {evidence.control_ref}
        </Text>
        <Text style={styles.subtitle}>{evidence.control_name}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionH}>Métadonnées audit (ISO 27001 §7.5)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Tenant</Text>
            <Text style={styles.value}>{tenant.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Référentiel</Text>
            <Text style={styles.value}>{framework}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contrôle</Text>
            <Text style={styles.value}>
              {evidence.control_ref} — {evidence.control_name}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Responsable désigné</Text>
            <Text style={styles.value}>
              {audit.ownerEmail ?? "(non renseigné côté Humanix)"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Période de couverture</Text>
            <Text style={styles.value}>
              {audit.coverageStart.slice(0, 10)} → {audit.coverageEnd.slice(0, 10)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Version du contenu</Text>
            <Text style={styles.valueMono}>v{audit.contentVersion}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>À ré-évaluer avant</Text>
            <Text style={styles.value}>{audit.expiryDate}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionH}>Données Humanix</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Statut conformité</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColor(evidence.status) },
                ]}
              >
                {evidence.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Score Humanix</Text>
            <Text style={styles.value}>
              {evidence.score != null ? `${evidence.score}/100` : "non évalué"}
            </Text>
          </View>
          {evidence.scope_note && (
            <View style={styles.row}>
              <Text style={styles.label}>Note de périmètre</Text>
              <Text style={styles.value}>{evidence.scope_note}</Text>
            </View>
          )}
          {evidence.artifacts.length > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Artefacts</Text>
              <View style={{ flex: 1 }}>
                {evidence.artifacts.map((a, i) => (
                  <Text key={i} style={{ fontSize: 9, marginBottom: 2 }}>
                    • {a.name}
                    {a.value !== undefined && a.unit
                      ? ` : ${a.value}${a.unit}`
                      : ""}
                    {a.url ? ` — ${a.url}` : ""}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          Humanix-Cybersecurity SASU · SIREN 103 901 799 · Document généré le{" "}
          {generatedAt} · Page 1/2
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Manifeste d'intégrité</Text>
            <Text style={styles.brandSub}>
              Signature cryptographique Ed25519
            </Text>
          </View>
          <Text style={styles.badge}>Ed25519</Text>
        </View>

        <Text style={styles.smallNote}>
          La signature ci-dessous porte sur le payload JSON canonical
          ci-dessous (et NON sur le binaire PDF, qui inclut la signature
          elle-même). Cette approche permet une vérification reproductible
          des années après l'émission, indépendamment de toute infrastructure
          Humanix.
        </Text>

        <View style={[styles.section, styles.manifestBlock]}>
          <Text style={styles.manifestKey}>Algorithme</Text>
          <Text style={styles.manifestVal}>{signature.algorithm}</Text>

          <Text style={styles.manifestKey}>Empreinte clé publique (SHA-256)</Text>
          <Text style={styles.manifestVal}>{signature.publicKeyFingerprint}</Text>

          <Text style={styles.manifestKey}>Hash SHA-256 du payload</Text>
          <Text style={styles.manifestVal}>{signature.contentHashSha256}</Text>

          <Text style={styles.manifestKey}>Signature (base64url)</Text>
          <Text style={styles.manifestVal}>{signature.signature}</Text>

          <Text style={styles.manifestKey}>Signé le</Text>
          <Text style={styles.manifestVal}>{signature.signedAt}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionH}>Payload signé (JSON canonical)</Text>
          <View style={styles.manifestBlock}>
            <Text style={styles.manifestVal}>
              {canonicalJson(payload)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionH}>Procédure de vérification</Text>
          <Text style={{ fontSize: 9, marginBottom: 6 }}>
            1. Récupérer la clé publique courante :
          </Text>
          <Text style={styles.manifestVal}>
            curl https://humanix-academie.fr/.well-known/humanix-pdf-pubkey.pem
            -o humanix.pub.pem
          </Text>
          <Text style={{ fontSize: 9, marginTop: 6, marginBottom: 6 }}>
            2. Sauver le payload canonical ci-dessus dans payload.json (sans
            ajout/retrait de byte), puis vérifier :
          </Text>
          <Text style={styles.manifestVal}>
            echo &lt;signature_b64url&gt; | base64 -d &gt; sig.bin{"\n"}
            openssl pkeyutl -verify -pubin -inkey humanix.pub.pem \\{"\n"}
            {"  "}-rawin -in payload.json -sigfile sig.bin
          </Text>
          <Text style={{ fontSize: 9, marginTop: 6 }}>
            Sortie attendue : <Text style={{ fontWeight: "bold" }}>Signature Verified Successfully</Text>
          </Text>
        </View>

        <Text style={styles.footer}>
          Humanix-Cybersecurity SASU · SIREN 103 901 799 · Empreinte{" "}
          {signature.publicKeyFingerprint.slice(0, 23)}… · Page 2/2
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Genere le PDF binaire d'une evidence, signe le payload canonical Ed25519,
 * et retourne le buffer pret a etre uploade.
 */
export async function renderSignedEvidencePdf(opts: {
  evidence: CisoEvidence;
  tenant: { id: string; name: string };
  framework: string;
  audit: EvidenceAuditMeta;
}): Promise<{ pdf: Buffer; signature: PdfSignature }> {
  const payload = buildPayload(
    opts.evidence,
    opts.tenant,
    opts.framework,
    opts.audit,
  );
  // Sign le payload canonical (JSON deterministique).
  const canonicalBuf = Buffer.from(
    canonicalJson(payload),
    "utf-8",
  );
  const signature = signPdfBuffer(canonicalBuf);

  // Render le PDF avec la signature incrustee dans la page 2.
  const pdf = await renderToBuffer(
    <EvidenceDoc
      evidence={opts.evidence}
      tenant={opts.tenant}
      framework={opts.framework}
      audit={opts.audit}
      payload={payload}
      signature={signature}
    />,
  );
  return { pdf, signature };
}
