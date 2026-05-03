"use client";
import { useTransition } from "react";
import { stopChallenge } from "@/app/admin/actions";

export default function StopChallengeButton({ challengeId }: { challengeId: string }) {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (!confirm("Arrêter le challenge en cours ?")) return;
    startTransition(async () => {
      try {
        await stopChallenge(challengeId);
      } catch {
        alert("Action impossible.");
      }
    });
  };

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="text-sm border-2 border-warn text-warn rounded-xl px-4 py-2 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Arrêt…" : "Arrêter"}
    </button>
  );
}
