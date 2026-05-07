// SPDX-License-Identifier: AGPL-3.0-or-later
// Formatter OSCAL v1.1.2 (NIST Open Security Controls Assessment Language).
// Sortie : Assessment Results Model.
// Reference : https://pages.nist.gov/OSCAL/reference/latest/assessment-results/json-outline/
//
// Pourquoi OSCAL ? C'est le format pivot officiel NIST pour echanger des
// preuves de conformite entre outils GRC. Eramba, OpenSCAP, RegScale, et
// tout outil OSCAL-aware peuvent ingerer notre sortie sans developpement
// specifique.
//
// Mapping de notre modele Humanix vers OSCAL :
//  - tenant Humanix         -> "subject" + "metadata.organization"
//  - control Humanix         -> "objective" et "finding"
//  - statut compliant        -> objective.status.state = "satisfied"
//  - statut partial / non    -> objective.status.state = "other-than-satisfied"
//  - statut not_assessed     -> objective.status.state = "not-applicable"
//  - artifacts (pdf, urls)   -> "observation.relevant-evidence"

import crypto from "crypto";
import type { FrameworkMapping, EvidenceStatus } from "@/lib/mapping-grc";

const OSCAL_VERSION = "1.1.2";
const HUMANIX_PARTY_UUID = "00000000-0000-4000-8000-000000000001";

export type OscalEvidence = {
  control_ref: string;
  control_name: string;
  category?: string;
  status: EvidenceStatus;
  score?: number;
  scope_note?: string;
  artifacts: Array<{
    type: string;
    name: string;
    value?: number;
    unit?: string;
    url?: string;
  }>;
};

export type OscalTenant = { id: string; name: string };

/**
 * Genere un UUID v4 deterministe a partir d'une cle (pour stabilite des
 * exports successifs). On hash MD5 pour produire 16 octets puis on force
 * les bits de version (4) et variant (RFC 4122).
 */
function uuidFromKey(key: string): string {
  const hash = crypto.createHash("md5").update(key).digest();
  // Force version 4
  hash[6] = (hash[6] & 0x0f) | 0x40;
  // Force variant RFC 4122
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function statusToOscalState(
  status: EvidenceStatus,
): "satisfied" | "other-than-satisfied" | "not-applicable" {
  if (status === "compliant") return "satisfied";
  if (status === "not_assessed") return "not-applicable";
  return "other-than-satisfied";
}

/**
 * Construit un Assessment Results OSCAL pour un export d'evidence Humanix.
 */
export function buildOscalAssessmentResults(args: {
  tenant: OscalTenant;
  framework: FrameworkMapping;
  evidences: OscalEvidence[];
  generatedAt: Date;
  baseUrl: string;
}): Record<string, unknown> {
  const { tenant, framework, evidences, generatedAt, baseUrl } = args;
  const arUuid = uuidFromKey(
    `humanix-ar-${tenant.id}-${framework.ref}-${generatedAt.toISOString()}`,
  );
  const resultUuid = uuidFromKey(`${arUuid}-result`);

  const observations = evidences.flatMap((e, idx) =>
    e.artifacts
      .filter((a) => a.url || a.value !== undefined)
      .map((a, j) => ({
        uuid: uuidFromKey(`${arUuid}-obs-${idx}-${j}`),
        title: a.name,
        description: a.url
          ? `Lien vers la preuve : ${a.url}`
          : `Mesure : ${a.value} ${a.unit ?? ""}`,
        methods: ["EXAMINE"],
        types: ["evidence"],
        collected: generatedAt.toISOString(),
        ...(a.url && {
          "relevant-evidence": [{ href: a.url, description: a.name }],
        }),
        props: [
          { name: "humanix.control-ref", value: e.control_ref },
          { name: "humanix.artifact-type", value: a.type },
          ...(a.value !== undefined
            ? [{ name: "humanix.metric-value", value: String(a.value) }]
            : []),
        ],
      })),
  );

  const findings = evidences.map((e, idx) => ({
    uuid: uuidFromKey(`${arUuid}-finding-${idx}`),
    title: `${e.control_ref} - ${e.control_name}`,
    description:
      e.scope_note ??
      `Evaluation automatique Humanix Academie pour le controle ${e.control_ref}.`,
    target: {
      type: "objective-id",
      "target-id": e.control_ref,
      status: { state: statusToOscalState(e.status) },
      ...(e.score !== undefined && {
        props: [{ name: "humanix.score", value: String(e.score) }],
      }),
    },
    "related-observations": observations
      .filter((o) =>
        o.props.some(
          (p) => p.name === "humanix.control-ref" && p.value === e.control_ref,
        ),
      )
      .map((o) => ({ "observation-uuid": o.uuid })),
  }));

  return {
    "assessment-results": {
      uuid: arUuid,
      metadata: {
        title: `Humanix Academie - Assessment Results - ${framework.title}`,
        "last-modified": generatedAt.toISOString(),
        version: "1.0.0",
        "oscal-version": OSCAL_VERSION,
        parties: [
          {
            uuid: HUMANIX_PARTY_UUID,
            type: "organization",
            name: "Humanix-Cybersecurity",
            "email-addresses": ["security@humanix-cybersecurity.fr"],
            "telephone-numbers": [],
            addresses: [
              {
                type: "work",
                "addr-lines": ["16 Rue Joseph Loiret"],
                city: "Ales",
                "postal-code": "30100",
                country: "FR",
              },
            ],
            links: [{ href: baseUrl, "media-type": "text/html" }],
          },
        ],
      },
      "import-ap": {
        href: `${baseUrl}/api/v1/oscal-component-definition/${framework.ref.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      },
      results: [
        {
          uuid: resultUuid,
          title: `Resultats d'evaluation - ${tenant.name}`,
          description: `Resultats automatises generes par Humanix Academie pour le tenant ${tenant.name} sur le referentiel ${framework.ref}.`,
          start: generatedAt.toISOString(),
          end: generatedAt.toISOString(),
          "reviewed-controls": {
            "control-selections": [
              {
                description: `Controles couverts par le mapping Humanix pour ${framework.ref}`,
                "include-controls": framework.controls.map((c) => ({
                  "control-id": c.ref,
                })),
              },
            ],
          },
          observations,
          findings,
          "local-definitions": {
            "assessment-subjects": [
              {
                type: "party",
                description: `Tenant Humanix Academie : ${tenant.name}`,
                "include-subjects": [
                  { "subject-uuid": HUMANIX_PARTY_UUID, type: "party" },
                ],
              },
            ],
          },
        },
      ],
    },
  };
}
