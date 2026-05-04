"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveModule, rejectModule } from "@/app/admin/contributions/actions";

export default function ModerationActions({ moduleId }: { moduleId: string }) {
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();

  const onApprove = () => {
    if (
      !confirm(
        "Approuver ce module ? Il sera publié dans le marketplace public.",
      )
    )
      return;
    startTransition(async () => {
      try {
        await approveModule(moduleId);
        router.refresh();
      } catch (e: any) {
        alert("Approbation impossible : " + (e?.message ?? "erreur"));
      }
    });
  };

  const onReject = () => {
    if (reason.length < 10) {
      alert("Le motif doit faire au moins 10 caractères.");
      return;
    }
    startTransition(async () => {
      try {
        await rejectModule(moduleId, reason);
        setRejecting(false);
        setReason("");
        router.refresh();
      } catch {
        alert("Refus impossible.");
      }
    });
  };

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2 w-full sm:w-auto">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motif du refus (10 caractères min — sera communiqué à l'auteur)"
          rows={2}
          maxLength={500}
          className="w-full sm:w-80 rounded-xl border-2 border-gray-200 p-2 text-sm focus:border-warn focus:outline-none"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              setRejecting(false);
              setReason("");
            }}
            className="text-xs text-gray-500"
          >
            Annuler
          </button>
          <button
            onClick={onReject}
            disabled={pending}
            className="bg-warn text-white text-sm py-2 px-4 rounded-xl hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? "…" : "Confirmer le refus"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setRejecting(true)}
        disabled={pending}
        className="text-sm border-2 border-warn text-warn rounded-xl px-4 py-2 hover:bg-red-50 disabled:opacity-50"
      >
        ✕ Refuser
      </button>
      <button
        onClick={onApprove}
        disabled={pending}
        className="btn-primary text-sm py-2 px-4"
      >
        {pending ? "…" : "✓ Approuver et publier"}
      </button>
    </div>
  );
}
