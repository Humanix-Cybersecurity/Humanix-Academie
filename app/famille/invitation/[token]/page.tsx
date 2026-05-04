// Page d'activation d'une invitation famille.
// Pas de login requis. Accueil chaleureux + redirige vers /famille apres
// activation pour laisser le proche decouvrir les articles.

import Link from "next/link";
import { headers } from "next/headers";
import { redeemInvite, hashIp } from "@/lib/family-invites";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bienvenue — Cyber Famille",
  description: "Votre accès Cyber Famille offert par un proche.",
};

export default async function InvitationRedeemPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Hash IP pour analytics anti-fraude (RGPD)
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip");
  const ipHash = hashIp(ip);

  const result = await redeemInvite({ token, ipHash: ipHash ?? undefined });

  if (!result.ok) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6" aria-hidden="true">
          😔
        </div>
        <h1 className="text-3xl font-extrabold text-primary-500 mb-3">
          Cette invitation n'est plus valable
        </h1>
        <p className="text-gray-600 mb-6">{result.error}</p>
        <p className="text-sm text-gray-500 mb-6">
          Pas de souci : les articles Cyber Famille restent gratuits et publics.
        </p>
        <Link href="/famille" className="btn-primary">
          Découvrir Cyber Famille
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="text-7xl mb-6" aria-hidden="true">
        🎁
      </div>
      <p className="text-xs uppercase tracking-widest text-pink-600 font-bold mb-2">
        Invitation activée
      </p>
      <h1 className="text-3xl font-extrabold text-primary-500 mb-4">
        Bienvenue dans Cyber Famille !
      </h1>

      <div className="card text-left mb-6 bg-gradient-to-br from-primary-50 to-pink-50 border-2 border-pink-300">
        <p className="text-gray-700 leading-relaxed">
          {result.sponsorUserName ? (
            <>
              <strong>{result.sponsorUserName}</strong>, qui suit le programme
              cyber chez <strong>{result.sponsorTenantName}</strong>, vous a
              offert l'accès à nos articles cyber grand public.
            </>
          ) : (
            <>
              Un proche de chez <strong>{result.sponsorTenantName}</strong> vous
              a offert l'accès à nos articles cyber grand public.
            </>
          )}
        </p>
        <p className="text-sm text-gray-600 mt-3">
          Aucun compte à créer. Aucune donnée collectée. Aucune publicité. Juste
          des articles utiles, écrits sans jargon.
        </p>
      </div>

      <Link href="/famille" className="btn-primary text-lg px-6 py-4">
        Découvrir mes articles offerts →
      </Link>

      <p className="text-xs text-gray-500 mt-8">
        Si vous ne souhaitez plus jamais recevoir d'invitation de ce type,
        ignorez simplement cette page : aucun mail ne vous sera envoyé.
      </p>
    </div>
  );
}
