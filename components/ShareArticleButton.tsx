"use client";

import { useState } from "react";

export default function ShareArticleButton({
  slug,
  title,
  description,
}: {
  slug: string;
  title: string;
  description: string;
}) {
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/librairie/${slug}?via=share`
    : `/librairie/${slug}`;

  const trackShare = async () => {
    try {
      await fetch("/api/me/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
    } catch {}
  };

  const onNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url });
        trackShare();
      } catch {
        // utilisateur a annule, on ne fait rien
      }
    } else {
      onCopy();
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackShare();
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const onWhatsApp = () => {
    const text = `${title}\n\n${description}\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    trackShare();
  };

  const onEmail = () => {
    const subject = encodeURIComponent(`À lire : ${title}`);
    const body = encodeURIComponent(`Je suis tombé sur cet article cyber, je pense qu'il peut t'être utile :\n\n${title}\n${description}\n\n${url}\n\n— Partagé via Humanix Académie`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    trackShare();
  };

  return (
    <div className="card bg-gradient-to-br from-pink-50 to-amber-50 border-pink-300 mt-8">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">💌</span>
        <div className="flex-1">
          <h3 className="font-bold text-primary-500">Partage cet article</h3>
          <p className="text-sm text-gray-600">
            Quelqu'un autour de toi pourrait avoir besoin de ces réflexes. Le lien est gratuit, sans inscription.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={onNativeShare}
          className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white border-2 border-gray-200 hover:border-accent-500 transition"
          aria-label="Partager"
        >
          <span className="text-2xl">📤</span>
          <span className="text-xs font-bold text-primary-500">Partager</span>
        </button>
        <button
          onClick={onWhatsApp}
          className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white border-2 border-gray-200 hover:border-green-500 transition"
          aria-label="Partager sur WhatsApp"
        >
          <span className="text-2xl">💬</span>
          <span className="text-xs font-bold text-primary-500">WhatsApp</span>
        </button>
        <button
          onClick={onEmail}
          className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white border-2 border-gray-200 hover:border-cyan-500 transition"
          aria-label="Partager par email"
        >
          <span className="text-2xl">✉️</span>
          <span className="text-xs font-bold text-primary-500">Email</span>
        </button>
        <button
          onClick={onCopy}
          className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white border-2 border-gray-200 hover:border-amber-500 transition relative"
          aria-label="Copier le lien"
        >
          <span className="text-2xl">{copied ? "✅" : "🔗"}</span>
          <span className="text-xs font-bold text-primary-500">{copied ? "Copié !" : "Copier"}</span>
        </button>
      </div>
      <p className="text-xs text-center text-gray-500 mt-3 italic">
        Chaque partage te rapproche du badge « Ambassadeur cyber » 🎖️
      </p>
    </div>
  );
}
