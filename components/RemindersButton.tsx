"use client";
import { useState } from "react";

export default function RemindersButton() {
  const [loading, setLoading] = useState<"check" | "send" | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "info" | "err";
    msg: string;
  } | null>(null);

  const onCheck = async () => {
    setLoading("check");
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/send-reminders");
      const data = await res.json();
      if (data.candidates === 0) {
        setFeedback({
          type: "info",
          msg: "Aucun utilisateur inactif à relancer 👍",
        });
      } else {
        setFeedback({
          type: "info",
          msg: `${data.candidates} utilisateur${data.candidates > 1 ? "s" : ""} inactif${data.candidates > 1 ? "s" : ""} depuis 7 jours.`,
        });
      }
    } catch {
      setFeedback({ type: "err", msg: "Erreur lors de la vérification." });
    }
    setLoading(null);
  };

  const onSend = async () => {
    if (
      !confirm(
        "Envoyer un rappel à tous les utilisateurs inactifs depuis 7+ jours ?",
      )
    )
      return;
    setLoading("send");
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/send-reminders", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error();
      const total = data.sent + data.simulated;
      setFeedback({
        type: "ok",
        msg: `${total} rappel${total > 1 ? "s" : ""} ${data.simulated > 0 ? "simulé" : "envoyé"}${total > 1 ? "s" : ""} (${data.errors} erreur${data.errors > 1 ? "s" : ""})`,
      });
    } catch {
      setFeedback({ type: "err", msg: "Envoi impossible." });
    }
    setLoading(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Détecte automatiquement les utilisateurs qui n'ont pas complété
        d'épisode depuis 7 jours et leur envoie un mail bienveillant via Hex.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCheck}
          disabled={loading !== null}
          className="btn-secondary text-sm flex-1"
        >
          {loading === "check" ? "Vérification…" : "Voir les inactifs"}
        </button>
        <button
          onClick={onSend}
          disabled={loading !== null}
          className="btn-primary text-sm flex-1"
        >
          {loading === "send" ? "Envoi…" : "✉️ Envoyer les rappels"}
        </button>
      </div>
      {feedback && (
        <p
          className={`text-sm text-center font-medium ${
            feedback.type === "ok"
              ? "text-success"
              : feedback.type === "err"
                ? "text-warn"
                : "text-primary-500"
          }`}
        >
          {feedback.msg}
        </p>
      )}
    </div>
  );
}
