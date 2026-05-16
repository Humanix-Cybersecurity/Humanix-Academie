// SPDX-License-Identifier: AGPL-3.0-or-later
// Mockup d'une scene de bureau rendue en SVG/JSX (pas d'image).
// Chaque element a une position en % du conteneur + un emoji
// representatif + un label optionnel (texte affiche, ex: contenu
// d'un post-it).
//
// Pourquoi pas une vraie photo : les photos brutes sont chers a
// produire en propre (besoin de droits image, scenettes a monter,
// etc.) et limitent la maintenance (modifier une scene = re-shoot).
// Le SVG/JSX est gratuit, accessible (aria-label), responsive, et
// les apprenants n'ont aucun mal a "lire" la scene.

import type { Media } from "@/lib/investigations/types";

type Props = {
  media: Extract<Media, { type: "photo-office-mockup" }>;
};

// Mapping kind -> emoji + classe couleur (semantic : rouge = risque
// fort, amber = risque moyen, gris = neutre/distractor potentiel).
// Les bordures/halos ne sont PAS appliquees ici pour ne pas donner
// la reponse a l'apprenant — c'est le clic + scoring qui revele.
const SCENE_ITEMS: Record<
  string,
  { emoji: string; label: string }
> = {
  // Office (clean desk audit)
  laptop_unlocked: { emoji: "💻", label: "Laptop" },
  sticky_note_password: { emoji: "🟨", label: "Post-it" },
  paper_confidential: { emoji: "📄", label: "Document" },
  phone_visible: { emoji: "📱", label: "Téléphone" },
  open_drawer: { emoji: "🗄️", label: "Tiroir" },
  trash_bin: { emoji: "🗑️", label: "Poubelle" },
  window_view: { emoji: "🪟", label: "Fenêtre" },
  coffee_mug: { emoji: "☕", label: "Mug" },
  office_chair: { emoji: "🪑", label: "Chaise" },
  desk_lamp: { emoji: "💡", label: "Lampe" },
  // Piggyback (entree de batiment)
  badge_reader: { emoji: "📟", label: "Lecteur badge" },
  open_door: { emoji: "🚪", label: "Porte ouverte" },
  polite_holder: { emoji: "🙋", label: "Personne tenant la porte" },
  unbadged_intruder: { emoji: "👤", label: "Intrus sans badge" },
  security_camera: { emoji: "📹", label: "Caméra" },
  tailgate_notice: { emoji: "🪧", label: "Affiche anti-tailgating" },
  // Trash bin (poubelle non securisee)
  loose_papers: { emoji: "📃", label: "Papiers en vrac" },
  envelope_confidential: { emoji: "✉️", label: "Enveloppe CONFIDENTIEL" },
  missing_shredder: { emoji: "❌", label: "Pas de broyeur" },
  id_card_thrown: { emoji: "🪪", label: "Carte d'identité jetée" },
  post_it_sensitive: { emoji: "🟨", label: "Post-it" },
  broken_lock: { emoji: "🔓", label: "Serrure cassée" },
};

const SCENE_HEADER: Record<
  string,
  { emoji: string; label: string; bgClass: string }
> = {
  office: {
    emoji: "🏢",
    label: "VUE BUREAU — REPÈRE LES INDICES",
    bgClass:
      "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800",
  },
  piggyback: {
    emoji: "🚪",
    label: "ENTRÉE DU BÂTIMENT — REPÈRE LES INDICES",
    bgClass:
      "bg-gradient-to-br from-slate-100 via-gray-50 to-zinc-100 dark:from-slate-900 dark:via-slate-800 dark:to-zinc-900",
  },
  trash_bin: {
    emoji: "🗑️",
    label: "POUBELLE COMMUNE — REPÈRE LES INDICES",
    bgClass:
      "bg-gradient-to-br from-stone-100 via-amber-50 to-orange-50 dark:from-stone-900 dark:via-amber-950 dark:to-orange-950",
  },
};

export default function PhotoOfficeMockup({ media }: Props) {
  const items = media.data.scene;
  const sceneType = media.data.sceneType ?? "office";
  const header = SCENE_HEADER[sceneType] ?? SCENE_HEADER.office;
  return (
    <div
      className={`rounded-2xl border-2 border-gray-300 dark:border-slate-700 ${header.bgClass} shadow-lg overflow-hidden`}
    >
      {/* Header */}
      <div className="bg-amber-900/80 text-amber-50 px-4 py-2 flex items-center gap-2 text-xs font-bold tracking-wider">
        <span>{header.emoji}</span>
        <span>{header.label}</span>
      </div>

      {/* Scene : ratio 16/10 pour ressembler a une vue plongeante */}
      <div
        className="relative w-full"
        style={{ aspectRatio: "16 / 10" }}
        role="img"
        aria-label="Vue plongeante d'un bureau de travail avec divers objets a analyser"
      >
        {/* Surface de bureau (texture bois subtile) */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(90deg, rgba(120,72,30,0.06) 0 12px, rgba(140,80,30,0.03) 12px 24px)",
          }}
        />

        {/* Items positionnes */}
        {items.map((item) => {
          const meta = SCENE_ITEMS[item.kind] ?? { emoji: "❓", label: item.kind };
          return (
            <div
              key={item.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
            >
              <span
                className="text-4xl sm:text-5xl drop-shadow-md"
                aria-label={meta.label}
                role="img"
              >
                {meta.emoji}
              </span>
              {item.label && (
                <span className="text-[10px] sm:text-xs bg-white/90 dark:bg-slate-900/90 px-1.5 py-0.5 rounded shadow-sm max-w-[140px] text-center leading-tight text-gray-800 dark:text-gray-100">
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 italic px-4 py-2 bg-amber-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700">
        🔍 Chaque élément de la scène peut être un risque cyber, un
        risque RH, ou un faux positif (mug, chaise...). À toi de
        discriminer dans les réponses ci-dessous.
      </p>
    </div>
  );
}
