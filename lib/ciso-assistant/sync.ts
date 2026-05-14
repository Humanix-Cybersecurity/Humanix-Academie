// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Orchestrator de sync : push des evidences Humanix vers CISO Assistant
// pour un tenant donne. Appele depuis la server action runSync() (admin UI).
//
// Flow :
//   1. Cree un CisoAssistantSyncRun (status=running) -> retourne le runId
//      utilise par l'UI SSE pour streamer les logs.
//   2. Charge la connexion CISO Assistant du tenant + dechiffre password.
//   3. Build le bundle Humanix (buildCisoBundle) -- pas d'appel HTTP local,
//      on lit la DB directement (gain de latence + pas besoin d'API key).
//   4. Login Knox + ensureFolder + loadExistingEvidences.
//   5. Pour chaque evidence : upsert + ecrit une ligne dans run.logs.
//   6. Met a jour run.status + counts + finishedAt.
//   7. Audit log CISO_SYNC_COMPLETED ou CISO_SYNC_FAILED.
//
// La fonction est async mais non-bloquante : la server action lance
// runSync() en fire-and-forget puis retourne le runId immediatement, et
// l'UI lit les logs via SSE.

import { AuditAction, AuditOutcome, AuditSeverity } from "@prisma/client";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";
import {
  SUPPORTED_FRAMEWORKS,
  type FrameworkRef,
} from "@/lib/mapping-grc";
import { buildCisoBundle } from "./build-bundle";
import { CisoAssistantClient, CisoError } from "./client";
import { decryptCisoPassword } from "./encryption";
import { renderSignedEvidencePdf } from "./evidence-pdf";
import { getCurrentPublicKeyPem } from "./pdf-signing";

function nowLine(level: "INFO" | "OK" | "WARN" | "FAIL", msg: string): string {
  const ts = new Date().toISOString().slice(11, 19); // HH:MM:SS UTC
  return `${ts} [${level}] ${msg}`;
}

async function appendLog(runId: string, line: string): Promise<void> {
  // On utilise une concat raw plutot que `set: existing + line` pour eviter
  // de relire le champ a chaque ligne. Postgres concat est atomique.
  await db.$executeRaw`UPDATE "CisoAssistantSyncRun" SET logs = logs || ${line + "\n"} WHERE id = ${runId}`;
}

export type SyncResult = {
  runId: string;
  status: "success" | "partial" | "failed";
  total: number;
  ok: number;
  fail: number;
};

export async function runCisoSync(opts: {
  tenantId: string;
  framework: FrameworkRef;
  triggeredBy: string;
  actor: { userId: string; email: string; role: string };
}): Promise<{ runId: string }> {
  const { tenantId, framework, triggeredBy, actor } = opts;

  if (!SUPPORTED_FRAMEWORKS.includes(framework)) {
    throw new Error(`Framework non supporte : ${framework}`);
  }

  const conn = await db.cisoAssistantConnection.findUnique({
    where: { tenantId },
  });
  if (!conn) {
    throw new Error("Aucune connexion CISO Assistant configuree pour ce tenant.");
  }

  const run = await db.cisoAssistantSyncRun.create({
    data: {
      tenantId,
      connectionId: conn.id,
      framework,
      status: "running",
      triggeredBy,
    },
    select: { id: true },
  });

  // Audit log declenchement (avant le travail asynchrone).
  await auditLog({
    action: AuditAction.CISO_SYNC_STARTED,
    actor,
    tenantId,
    target: { type: "ciso_sync_run", id: run.id, label: framework },
    message: `Sync CISO Assistant lancee (framework=${framework})`,
  });

  // Fire-and-forget : on ne await PAS le sync complet pour que la server
  // action retourne le runId immediatement. L'UI suit via SSE.
  void executeSync(run.id, tenantId, framework, conn, actor).catch(
    (err) => {
      console.error("[ciso-sync] uncaught error", err);
    },
  );

  return { runId: run.id };
}

// Version semver du contenu pedagogique Humanix utilise. Met a jour
// manuellement a chaque release majeure du content-pro (cf. humanix-content-pro
// repo). Permet a un auditeur de reconstruire la preuve : "cette evidence
// a ete produite avec le contenu Humanix 2026.05.x".
const HUMANIX_CONTENT_VERSION =
  process.env.HUMANIX_CONTENT_VERSION ?? "2026.05";

// Periode de couverture par defaut (en jours). 365 = un an, aligne sur
// l'audit annuel ISO 27001 / NIS2.
const COVERAGE_DAYS = 365;

async function executeSync(
  runId: string,
  tenantId: string,
  framework: FrameworkRef,
  conn: {
    baseUrl: string;
    username: string;
    passwordEnc: string;
    folderName: string;
    verifySSL: boolean;
    ownerEmail: string | null;
    createAppliedControls: boolean;
    createFindings: boolean;
  },
  actor: { userId: string; email: string; role: string },
): Promise<void> {
  const startedAt = Date.now();
  // ATTENTION : NEXT_PUBLIC_BASE_URL est inline par Next au build-time.
  // Avec docker-compose passant "" (empty string) si la var shell n'existe
  // pas, process.env.NEXT_PUBLIC_BASE_URL = "" au runtime. Le `??` ne
  // remplace que null/undefined, PAS "". On utilise `||` pour traiter
  // aussi empty string -> fallback.
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://humanix-academie.fr";

  try {
    await appendLog(runId, nowLine("INFO", `Démarrage sync framework=${framework}`));
    await appendLog(runId, nowLine("INFO", `Tenant=${tenantId}`));

    const tenant = await db.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { id: true, name: true, createdAt: true },
    });

    // Periode de couverture : max(tenant.createdAt, now - 365j) -> now.
    // On ne pretend pas couvrir une periode anterieure a l'existence du
    // tenant (les preuves ne pourraient pas exister avant son onboarding).
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - COVERAGE_DAYS * 86400 * 1000);
    const coverageStart =
      tenant.createdAt > oneYearAgo ? tenant.createdAt : oneYearAgo;
    const coverageEnd = now;
    const expiryDate = new Date(now.getTime() + COVERAGE_DAYS * 86400 * 1000)
      .toISOString()
      .slice(0, 10); // YYYY-MM-DD

    const auditMeta = {
      ownerEmail: conn.ownerEmail,
      coverageStart: coverageStart.toISOString(),
      coverageEnd: coverageEnd.toISOString(),
      contentVersion: HUMANIX_CONTENT_VERSION,
      expiryDate,
    };

    await appendLog(
      runId,
      nowLine(
        "INFO",
        `Période de couverture : ${coverageStart.toISOString().slice(0, 10)} → ${coverageEnd.toISOString().slice(0, 10)} (réaudit avant ${expiryDate})`,
      ),
    );
    await appendLog(
      runId,
      nowLine(
        "INFO",
        `Contenu Humanix v${HUMANIX_CONTENT_VERSION} — Responsable : ${conn.ownerEmail ?? "(non renseigné)"}`,
      ),
    );

    await appendLog(runId, nowLine("INFO", "Construction du bundle Humanix..."));
    const bundle = await buildCisoBundle({
      tenant,
      frameworkRef: framework,
      baseUrl,
    });
    await appendLog(
      runId,
      nowLine(
        "INFO",
        `Bundle : ${bundle.evidences.length} contrôles, ${bundle.summary.compliant} compliants, ${bundle.summary.non_compliant} non conformes`,
      ),
    );

    const password = decryptCisoPassword(conn.passwordEnc);
    const client = new CisoAssistantClient({
      baseUrl: conn.baseUrl,
      username: conn.username,
      password,
      folderName: conn.folderName,
      verifySSL: conn.verifySSL,
    });

    await appendLog(runId, nowLine("INFO", `Login CISO Assistant : ${conn.baseUrl}`));
    await client.login();
    await appendLog(runId, nowLine("OK", "Authentifié (token Knox)"));

    await appendLog(runId, nowLine("INFO", `Folder « ${conn.folderName} »...`));
    const folderId = await client.ensureFolder();
    await appendLog(
      runId,
      nowLine("OK", `Folder « ${conn.folderName} » prêt (id ${folderId})`),
    );

    const existingCount = await client.loadExistingEvidences();
    await appendLog(
      runId,
      nowLine("INFO", `Cache : ${existingCount} evidences existantes dans le folder`),
    );

    const pubkey = getCurrentPublicKeyPem();
    if (pubkey.ephemeral) {
      await appendLog(
        runId,
        nowLine(
          "WARN",
          `Clé de signature PDF ÉPHÉMÈRE (régénérée au boot) — empreinte ${pubkey.fingerprint.slice(0, 23)}…`,
        ),
      );
    } else {
      await appendLog(
        runId,
        nowLine(
          "INFO",
          `Clé de signature PDF persistante — empreinte ${pubkey.fingerprint.slice(0, 23)}…`,
        ),
      );
    }

    // v1.3 hooks optionnels : AppliedControl + FindingsAssessment.
    // Fire-and-forget : un echec sur les extensions ne casse JAMAIS la sync
    // principale (push des evidences). Principe d'autonomie : Humanix
    // continue de fonctionner si CISO Assistant est down ou refuse.
    let appliedControlId: string | null = null;
    let findingsAssessmentId: string | null = null;
    const evidenceIdsForLink: string[] = [];

    if (conn.createAppliedControls) {
      try {
        appliedControlId = await client.ensureAppliedControl(framework);
        await appendLog(
          runId,
          appliedControlId
            ? nowLine("OK", `AppliedControl prêt (id ${appliedControlId})`)
            : nowLine("WARN", "AppliedControl non créé (extension désactivée côté CISO Assistant ?)"),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await appendLog(runId, nowLine("WARN", `AppliedControl: ${msg}`));
      }
    }

    if (conn.createFindings) {
      try {
        findingsAssessmentId = await client.ensureFindingsAssessment(framework);
        await appendLog(
          runId,
          findingsAssessmentId
            ? nowLine("OK", `FindingsAssessment prêt (id ${findingsAssessmentId})`)
            : nowLine("WARN", "FindingsAssessment non créé"),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await appendLog(runId, nowLine("WARN", `FindingsAssessment: ${msg}`));
      }
    }

    let ok = 0;
    let fail = 0;
    for (const evidence of bundle.evidences) {
      const result = await client.upsertEvidence(evidence, baseUrl, auditMeta);
      if (!result.ok) {
        fail += 1;
        await appendLog(
          runId,
          nowLine(
            "FAIL",
            `${result.controlRef} : HTTP ${result.status} ${result.error}`,
          ),
        );
        continue;
      }

      ok += 1;
      await appendLog(
        runId,
        nowLine(
          "OK",
          `${result.action} ${result.controlRef} → evidence ${result.id}`,
        ),
      );
      evidenceIdsForLink.push(result.id);

      // v1.3 Finding : pour partial / non_compliant, on cree un constat
      // actionnable. Non-bloquant : echec ne casse pas la sync.
      if (
        conn.createFindings &&
        findingsAssessmentId &&
        (evidence.status === "partial" ||
          evidence.status === "non_compliant")
      ) {
        try {
          const fr = await client.upsertFinding({
            findingsAssessmentId,
            controlRef: evidence.control_ref,
            controlName: evidence.control_name ?? evidence.control_ref,
            status: evidence.status,
            score: evidence.score,
            appliedControlId,
            etaDate: auditMeta.expiryDate,
          });
          if (fr.ok) {
            await appendLog(
              runId,
              nowLine(
                "OK",
                `Finding ${fr.action} ${evidence.control_ref} (P${evidence.status === "non_compliant" ? 1 : 2}, ETA ${auditMeta.expiryDate})`,
              ),
            );
          } else {
            await appendLog(
              runId,
              nowLine("WARN", `Finding non créé pour ${evidence.control_ref}`),
            );
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await appendLog(
            runId,
            nowLine("WARN", `Finding échec ${evidence.control_ref}: ${msg}`),
          );
        }
      }

      // Generation + signature + upload du PDF audit-ready (v1.2).
      // Errors non-bloquant : un upload PDF rate ne fait pas echouer
      // la sync globale (l'evidence textuelle est deja en place).
      try {
        const { pdf, signature } = await renderSignedEvidencePdf({
          evidence,
          tenant,
          framework,
          audit: auditMeta,
        });
        // Sanitize : Django FileUploadParser parse le filename via regex
        // sur Content-Disposition. Caracteres ":", "/" et espaces peuvent
        // casser le parsing -> upload silencieusement vide.
        const safeName = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, "_");
        const filename = `humanix-${safeName(framework)}-${safeName(evidence.control_ref)}.pdf`;
        const up = await client.uploadAttachment(result.id, filename, pdf);
        if (up.ok) {
          await appendLog(
            runId,
            nowLine(
              "OK",
              `PDF signé attaché à ${result.controlRef} (${(pdf.byteLength / 1024).toFixed(1)} KB, sig ${signature.signature.slice(0, 12)}…)`,
            ),
          );
        } else {
          await appendLog(
            runId,
            nowLine(
              "WARN",
              `PDF non attaché pour ${result.controlRef} : HTTP ${up.status} ${up.error}`,
            ),
          );
        }
      } catch (pdfErr) {
        const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
        await appendLog(
          runId,
          nowLine("WARN", `PDF échec ${result.controlRef} : ${msg}`),
        );
      }
    }

    // Link M2M des evidences poussees au AppliedControl (si active).
    if (
      conn.createAppliedControls &&
      appliedControlId &&
      evidenceIdsForLink.length > 0
    ) {
      try {
        const ok = await client.linkEvidencesToAppliedControl(
          appliedControlId,
          evidenceIdsForLink,
        );
        await appendLog(
          runId,
          ok
            ? nowLine(
                "OK",
                `AppliedControl lié à ${evidenceIdsForLink.length} evidence(s)`,
              )
            : nowLine("WARN", "AppliedControl link M2M échoué"),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await appendLog(runId, nowLine("WARN", `Link M2M: ${msg}`));
      }
    }

    const status =
      fail === 0 ? "success" : ok === 0 ? "failed" : "partial";
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    await appendLog(
      runId,
      nowLine(
        status === "success" ? "OK" : status === "partial" ? "WARN" : "FAIL",
        `=== ${status.toUpperCase()} : ${ok}/${bundle.evidences.length} synchronisées en ${elapsed}s, ${fail} échec(s)`,
      ),
    );

    await db.cisoAssistantSyncRun.update({
      where: { id: runId },
      data: {
        status,
        finishedAt: new Date(),
        evidencesTotal: bundle.evidences.length,
        evidencesOk: ok,
        evidencesFail: fail,
      },
    });

    await auditLog({
      action:
        status === "failed"
          ? AuditAction.CISO_SYNC_FAILED
          : AuditAction.CISO_SYNC_COMPLETED,
      outcome: status === "failed" ? AuditOutcome.FAILURE : AuditOutcome.SUCCESS,
      severity: status === "failed" ? AuditSeverity.WARNING : AuditSeverity.INFO,
      actor,
      tenantId,
      target: { type: "ciso_sync_run", id: runId, label: framework },
      message: `Sync ${status} : ${ok}/${bundle.evidences.length} OK, ${fail} échec(s)`,
      metadata: { framework, ok, fail, total: bundle.evidences.length },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const reason = err instanceof CisoError ? err.reason : "unknown";
    await appendLog(runId, nowLine("FAIL", `Erreur fatale (${reason}) : ${msg}`));
    await db.cisoAssistantSyncRun.update({
      where: { id: runId },
      data: { status: "failed", finishedAt: new Date() },
    });
    await auditLog({
      action: AuditAction.CISO_SYNC_FAILED,
      outcome: AuditOutcome.FAILURE,
      severity: AuditSeverity.WARNING,
      actor,
      tenantId,
      target: { type: "ciso_sync_run", id: runId, label: framework },
      message: `Sync failed : ${msg.slice(0, 200)}`,
      metadata: { framework, reason },
    });
  }
}
