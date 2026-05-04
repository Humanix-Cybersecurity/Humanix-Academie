// Page connectee : un employe peut offrir 3 acces gratuits a /famille a ses
// proches. Pre-requis : avoir complete au moins 1 saison.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isEligibleToInvite,
  remainingInvitesFor,
  MAX_INVITES_PER_USER,
} from "@/lib/family-invites";
import { sendInviteAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Offrir Cyber Famille à mes proches | Humanix Académie",
  description:
    "Offre 3 accès gratuits aux articles Cyber Famille à tes proches.",
};

export default async function FamilleInviterPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion?next=/famille/inviter");
  const userId = session.user!.id as string;
  const tenantId = session.user!.tenantId as string;

  const [eligible, remaining, history] = await Promise.all([
    isEligibleToInvite(userId, tenantId),
    remainingInvitesFor(userId),
    db.familyInvite.findMany({
      where: { sponsorUserId: userId },
      orderBy: { sentAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-pink-600 font-bold mb-2">
          Cyber Famille — programme ambassadeur
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-500 mb-3">
          Offrez Cyber Famille à 3 proches
        </h1>
        <p className="text-gray-700 dark:text-gray-300 max-w-xl mx-auto">
          Vos parents, votre conjoint·e, vos ados : ils sont aussi exposés que
          vous l'étiez. Offrez-leur un accès gratuit aux articles Cyber Famille,
          écrits sans jargon. Aucun compte à créer pour eux, aucune donnée
          collectée.
        </p>
      </div>

      {/* Etat */}
      {!eligible ? (
        <div className="card border-l-4 border-amber-400 bg-amber-50 mb-6">
          <h2 className="font-bold text-amber-700 mb-1">
            ⏳ Vous n'êtes pas encore éligible
          </h2>
          <p className="text-sm text-amber-800">
            Vous pourrez offrir vos 3 invitations dès que vous aurez terminé{" "}
            <strong>au moins une saison complète</strong> dans Humanix Académie.
            Continuez votre progression !
          </p>
          <div className="mt-3">
            <Link href="/apprendre" className="btn-primary text-sm">
              Reprendre mes modules
            </Link>
          </div>
        </div>
      ) : remaining === 0 ? (
        <div className="card border-l-4 border-gray-300 bg-gray-50 mb-6">
          <h2 className="font-bold text-gray-700 mb-1">
            🎉 Vous avez utilisé vos 3 invitations
          </h2>
          <p className="text-sm text-gray-600">
            Merci d'avoir partagé Humanix avec vos proches ! Le quota est de{" "}
            {MAX_INVITES_PER_USER} invitations par employé.
          </p>
        </div>
      ) : (
        <div className="card border-l-4 border-pink-400 bg-pink-50 mb-6">
          <h2 className="font-bold text-pink-700 mb-1">
            🎁 Il vous reste {remaining} invitation{remaining > 1 ? "s" : ""}
          </h2>
          <p className="text-sm text-pink-800">
            Chaque proche reçoit un email personnel avec un lien de
            confirmation. L'invitation est valable 90 jours.
          </p>
        </div>
      )}

      {/* Formulaire d'invitation */}
      {eligible && remaining > 0 && (
        <form action={sendInviteAction} className="card space-y-4 mb-6">
          <h2 className="text-xl font-bold text-primary-500">
            Inviter un proche
          </h2>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="invitee-firstname"
                className="block text-xs font-bold uppercase text-gray-500 mb-1"
              >
                Prénom (facultatif)
              </label>
              <input
                id="invitee-firstname"
                name="inviteeFirstName"
                type="text"
                maxLength={80}
                placeholder="Ex : Maman, Léa…"
                className="input w-full"
              />
            </div>
            <div>
              <label
                htmlFor="invitee-email"
                className="block text-xs font-bold uppercase text-gray-500 mb-1"
              >
                Email du proche{" "}
                <span className="text-red-500" aria-hidden="true">
                  *
                </span>
                <span className="sr-only"> (champ obligatoire)</span>
              </label>
              <input
                id="invitee-email"
                name="inviteeEmail"
                type="email"
                required
                maxLength={200}
                placeholder="prenom@example.com"
                className="input w-full"
                aria-required="true"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="invitee-message"
              className="block text-xs font-bold uppercase text-gray-500 mb-1"
            >
              Message personnel (facultatif)
            </label>
            <textarea
              id="invitee-message"
              name="personalMessage"
              maxLength={800}
              rows={3}
              placeholder="Hello Maman, j'ai vu plein de bons conseils chez Humanix au boulot, j'aimerais te les partager pour que tu te fasses pas avoir."
              className="input w-full resize-y"
            />
            <p className="text-xs text-gray-500 mt-1">
              Apparaît dans l'email envoyé au destinataire (max 800 caractères).
            </p>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl">
            <p className="font-bold mb-1">RGPD — engagement de loyauté</p>
            <p>
              En envoyant cette invitation, vous confirmez avoir une relation
              personnelle avec le destinataire et que celui-ci n'a pas exprimé
              de refus de recevoir des messages cyber-pédagogiques. Vous restez
              responsable du choix d'inviter cette personne. Le destinataire
              peut ignorer le message et n'aura plus aucun contact de notre
              part.
            </p>
          </div>

          <button type="submit" className="btn-primary">
            Envoyer l'invitation
          </button>
        </form>
      )}

      {/* Historique */}
      <h2 className="text-xl font-bold text-primary-500 mb-3 mt-8">
        Vos invitations envoyées
      </h2>
      {history.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucune invitation envoyée pour le moment.
        </p>
      ) : (
        <ul className="space-y-2">
          {history.map((h) => (
            <li
              key={h.id}
              className="card flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary-500 truncate">
                  {h.inviteeFirstName ? `${h.inviteeFirstName} — ` : ""}
                  {h.inviteeEmail}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Envoyée le {h.sentAt.toLocaleDateString("fr-FR")}
                </p>
              </div>
              <StatusBadge status={h.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: "⏳ En attente",
      className: "bg-amber-100 text-amber-700",
    },
    REDEEMED: {
      label: "✓ Activée",
      className: "bg-green-100 text-green-700",
    },
    EXPIRED: {
      label: "⌛ Expirée",
      className: "bg-gray-100 text-gray-600",
    },
    REVOKED: {
      label: "✕ Révoquée",
      className: "bg-red-100 text-red-700",
    },
  };
  const m = map[status] ?? map.PENDING;
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded-full ${m.className}`}>
      {m.label}
    </span>
  );
}
