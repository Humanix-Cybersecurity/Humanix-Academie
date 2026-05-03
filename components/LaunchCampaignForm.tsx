"use client";
import { useTransition, useState } from "react";
import { launchCampaign } from "@/app/admin/phishing/actions";
import { PHISHING_TEMPLATES } from "@/lib/phishing";
import clsx from "clsx";

export default function LaunchCampaignForm({ services }: { services: string[] }) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>("FAKE_MICROSOFT");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const onSubmit = async (formData: FormData) => {
    setFeedback(null);
    formData.set("template", selected);
    startTransition(async () => {
      try {
        const res = await launchCampaign(formData);
        setFeedback({ type: "ok", msg: `🚀 Campagne lancée vers ${res.targets} cible${res.targets > 1 ? "s" : ""}` });
      } catch (e: any) {
        const msg = e?.message === "no_targets" ? "Aucune cible trouvée." : "Lancement impossible.";
        setFeedback({ type: "err", msg });
      }
    });
  };

  const tpl = PHISHING_TEMPLATES.find((t) => t.id === selected);

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Template</label>
        <div className="grid sm:grid-cols-3 gap-3">
          {PHISHING_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={clsx(
                "text-left p-4 rounded-xl border-2 transition-all",
                selected === t.id ? "border-accent-500 bg-accent-50 scale-[1.02]" : "border-gray-200 hover:border-gray-300",
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{t.emoji}</span>
                <span className="font-bold text-primary-500 text-sm">{t.name}</span>
              </div>
              <p className="text-xs text-gray-600 mb-2">{t.description}</p>
              <span
                className={clsx(
                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                  t.difficulty === "easy" ? "bg-green-100 text-green-700" : t.difficulty === "medium" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700",
                )}
              >
                {t.difficulty === "easy" ? "Facile" : t.difficulty === "medium" ? "Moyen" : "Difficile"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Cible</label>
        <select name="service" className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-accent-500 focus:outline-none text-sm bg-white">
          <option value="">Tous les collaborateurs actifs</option>
          {services.map((s) => (
            <option key={s} value={s}>
              Service : {s}
            </option>
          ))}
        </select>
      </div>

      {tpl && (
        <details className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">
          <summary className="cursor-pointer font-medium">Aperçu de l'email piégé</summary>
          <div className="mt-2 space-y-1">
            <p><strong>De :</strong> {tpl.emailFrom}</p>
            <p><strong>Sujet :</strong> {tpl.emailSubject}</p>
            <p className="mt-2 font-bold">Marqueurs pédagogiques :</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {tpl.markers.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        </details>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Lancement…" : "🚀 Lancer la campagne"}
      </button>

      {feedback && (
        <p className={`text-sm text-center font-medium ${feedback.type === "ok" ? "text-success" : "text-warn"}`}>
          {feedback.msg}
        </p>
      )}

      <p className="text-xs text-gray-400 italic text-center">
        En mode démo, les emails ne sont pas réellement envoyés. En production, ils partent via Resend avec liens trackés.
      </p>
    </form>
  );
}
