"use client";
import { useTransition } from "react";
import { startChallenge } from "@/app/admin/actions";

export default function StartChallengeForm() {
  const [pending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await startChallenge(formData);
      } catch {
        alert("Lancement impossible.");
      }
    });
  };

  return (
    <form action={onSubmit} className="space-y-3">
      <input
        name="title"
        type="text"
        defaultValue="Cyber-Challenge des équipes"
        className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-accent-500 focus:outline-none text-sm"
        placeholder="Nom du challenge"
      />
      <textarea
        name="description"
        rows={2}
        className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-accent-500 focus:outline-none text-sm"
        placeholder="Description (facultative)"
        defaultValue="On forme les équipes en cyber sur 7 jours, à fond ! Le service le plus actif gagne le droit de bombe le suivant 🍕"
      />
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-700 font-medium">Durée :</label>
        <select
          name="durationDays"
          defaultValue="7"
          className="rounded-xl border-2 border-gray-200 p-2 text-sm bg-white"
        >
          <option value="3">3 jours (sprint éclair)</option>
          <option value="7">7 jours (challenge classique)</option>
          <option value="14">14 jours (deux semaines)</option>
          <option value="30">30 jours (Cybermois)</option>
        </select>
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Lancement…" : "🚀 Lancer le challenge"}
      </button>
    </form>
  );
}
