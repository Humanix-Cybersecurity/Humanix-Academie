"use client";
import { useTransition } from "react";
import { stopCampaign, simulateClicks } from "@/app/admin/phishing/actions";

export default function CampaignActions({ campaignId, isActive }: { campaignId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();

  const onSimulate = () => {
    startTransition(async () => {
      try {
        await simulateClicks(campaignId);
      } catch {}
    });
  };

  const onStop = () => {
    if (!confirm("Arrêter cette campagne ?")) return;
    startTransition(async () => {
      try {
        await stopCampaign(campaignId);
      } catch {}
    });
  };

  if (!isActive) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-2 whitespace-nowrap">
      <button
        onClick={onSimulate}
        disabled={pending}
        className="text-xs border-2 border-accent-500 text-accent-500 rounded-xl px-3 py-1.5 hover:bg-accent-50 disabled:opacity-50"
        title="Simule des clics aléatoires (pour démo uniquement)"
      >
        🎲 Simuler des clics
      </button>
      <button
        onClick={onStop}
        disabled={pending}
        className="text-xs border-2 border-warn text-warn rounded-xl px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
      >
        Arrêter
      </button>
    </div>
  );
}
