// Admin > Phishing simule
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNav from "@/components/AdminNav";
import { PHISHING_TEMPLATES } from "@/lib/phishing";
import LaunchCampaignForm from "@/components/LaunchCampaignForm";
import CampaignActions from "@/components/CampaignActions";
import PlanGate from "@/components/PlanGate";
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function AdminPhishingPage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") redirect("/apprendre");
  const tenantId = (session.user as any).tenantId as string;

  const plan = await getTenantPlan(tenantId);

  // Gate : Phishing simule = Pro+
  if (!planHasFeature(plan, "phishing")) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold text-primary-500">Console dirigeant</h1>
        <p className="text-gray-600 mb-6">Gestion fine de votre programme de sensibilisation cyber.</p>
        <AdminNav />
        <div className="mt-8">
          <PlanGate feature="phishing" currentPlan={plan} requiredPlan={FEATURE_MIN_PLAN.phishing} />
        </div>
      </div>
    );
  }

  const [services, campaigns] = await Promise.all([
    db.user.findMany({
      where: { tenantId, isActive: true },
      select: { service: true },
      distinct: ["service"],
    }),
    db.phishingCampaign.findMany({
      where: { tenantId },
      include: { results: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const distinctServices = services.map((s) => s.service).filter(Boolean) as string[];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-primary-500">Console dirigeant</h1>
      <p className="text-gray-600 mb-6">Gestion fine de votre programme de sensibilisation cyber.</p>

      <AdminNav />

      <div className="card mb-6 bg-amber-50 border-amber-300">
        <h3 className="font-bold text-amber-900 mb-2">⚖️ Cadre éthique et légal</h3>
        <p className="text-sm text-amber-800 leading-relaxed">
          Les simulations de phishing doivent être <strong>annoncées préalablement</strong> aux salariés (charte, CSE).
          Aucun usage disciplinaire des résultats. Pas de stigmatisation : seuls les chiffres agrégés sont exploités.
          Conformément au RGPD (art. 32) et au Code pénal (art. 323), ces tests sont des
          <strong> exercices pédagogiques</strong>, pas des attaques.
        </p>
      </div>

      {/* Bandeau cross-sell vers le generateur IA Mistral */}
      <div className="card mb-6 bg-gradient-to-br from-primary-500 to-accent-500 text-white border-0">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-4xl" aria-hidden="true">🤖</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest opacity-80 font-bold mb-1">
              🇫🇷 Nouveauté — IA souveraine française
            </p>
            <h3 className="text-lg font-bold">
              Générer un mail de phishing sur-mesure en 5 secondes
            </h3>
            <p className="text-sm opacity-90 mt-1">
              Décrivez votre cible (service, contexte) — Mistral génère un mail
              crédible avec les signaux faibles à débriefer. Aucune donnée hors UE.
            </p>
          </div>
          <a href="/admin/phishing/generer" className="bg-white text-primary-500 font-bold px-4 py-2 rounded-xl hover:scale-105 transition shadow-md text-sm whitespace-nowrap">
            🪄 Ouvrir le générateur
          </a>
        </div>
      </div>

      {/* Bandeau cross-sell vers le batch personnalise (1 mail unique par employe) */}
      <div className="card mb-6 bg-gradient-to-br from-accent-500 to-primary-500 text-white border-0">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-4xl" aria-hidden="true">🎯</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest opacity-80 font-bold mb-1">
              Nouveau — Ultra-personnalisé
            </p>
            <h3 className="text-lg font-bold">
              Générer 1 phishing UNIQUE par employé en 1 batch
            </h3>
            <p className="text-sm opacity-90 mt-1">
              Sélectionnez vos cibles → l'IA génère un mail différent pour chacune
              (service, contexte, ton). Imprenable de réalisme.
            </p>
          </div>
          <a href="/admin/phishing/personalize" className="bg-white text-primary-500 font-bold px-4 py-2 rounded-xl hover:scale-105 transition shadow-md text-sm whitespace-nowrap">
            🚀 Lancer le batch personnalisé
          </a>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-primary-500 mb-4">🎣 Lancer une campagne</h2>
      <div className="card mb-8">
        <LaunchCampaignForm services={distinctServices} />
      </div>

      <h2 className="text-2xl font-bold text-primary-500 mb-4">📊 Campagnes récentes</h2>
      {campaigns.length === 0 ? (
        <div className="card text-center py-8 text-gray-400 italic">
          Aucune campagne pour l'instant.
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => {
            const sent = c.results.length;
            const clicked = c.results.filter((r) => r.status === "CLICKED").length;
            const reported = c.results.filter((r) => r.status === "REPORTED").length;
            const ignored = sent - clicked - reported;
            const tpl = PHISHING_TEMPLATES.find((t) => t.id === c.template);
            return (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{tpl?.emoji ?? "🎣"}</span>
                      <h3 className="font-bold text-primary-500 text-lg">{c.title}</h3>
                      {c.isActive ? (
                        <span className="text-xs bg-success text-white px-2 py-0.5 rounded-full font-bold">EN COURS</span>
                      ) : (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">TERMINÉE</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Lancée le {c.sentAt?.toLocaleDateString("fr-FR")} · {sent} cible{sent > 1 ? "s" : ""}
                    </p>
                  </div>
                  <CampaignActions campaignId={c.id} isActive={c.isActive} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <ResultStat label="Cliqué" value={clicked} total={sent} color="warn" />
                  <ResultStat label="Signalé" value={reported} total={sent} color="success" />
                  <ResultStat label="Ignoré" value={ignored} total={sent} color="gray" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResultStat({ label, value, total, color }: { label: string; value: number; total: number; color: "warn" | "success" | "gray" }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const bgClass =
    color === "warn" ? "bg-red-50 text-warn" : color === "success" ? "bg-green-50 text-success" : "bg-gray-50 text-gray-600";
  return (
    <div className={`rounded-xl p-3 ${bgClass}`}>
      <p className="text-2xl font-extrabold">
        {value} <span className="text-sm font-medium">({pct}%)</span>
      </p>
      <p className="text-xs uppercase tracking-wide font-bold">{label}</p>
    </div>
  );
}
