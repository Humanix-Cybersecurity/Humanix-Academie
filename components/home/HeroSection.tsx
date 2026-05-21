// SPDX-License-Identifier: AGPL-3.0-or-later
// Hero section de la home : cyber-meteo + logo + h1 + sous-titre + CTAs.

import Image from "next/image";
import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import { CyberMeteoCompact } from "@/components/CyberMeteoBadge";
import type { CyberMeteo } from "@/lib/cyber-meteo";

export default function HeroSection({ meteo }: { meteo: CyberMeteo }) {
  return (
    <HexBackdrop intensity="medium" className="bg-humanix-soft">
      <section
        aria-labelledby="hero-title"
        className="max-w-5xl mx-auto px-4 pt-12 pb-20 sm:pt-16 sm:pb-28"
      >
        <div className="flex justify-center mb-6 animate-fadeIn">
          <CyberMeteoCompact meteo={meteo} />
        </div>

        <div className="text-center">
          <div
            className="flex justify-center mb-8 animate-slide-up"
            style={{ animationDelay: "60ms" }}
          >
            <Image
              src="/logo-humanix-academie-512.png"
              alt="Humanix Académie"
              width={240}
              height={363}
              priority
              className="h-auto w-auto max-h-56 sm:max-h-64 animate-float"
            />
          </div>

          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-6 animate-slide-up"
            style={{ animationDelay: "180ms" }}
          >
            La cyber pour tous,
            <br />
            <span className="bg-gradient-to-r from-accent-500 via-primary-500 to-accent-500 bg-clip-text text-transparent animate-gradient">
              à partir de cinq minutes par semaine.
            </span>
          </h1>

          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up"
            style={{ animationDelay: "300ms" }}
          >
            Reconnaître les arnaques numériques avant de cliquer :
            phishing, faux SMS, QR codes piégés, faux profils.{" "}
            <strong className="text-gray-900 dark:text-white font-semibold">
              Un mini-épisode par semaine, en français, pour ton équipe{" "}
              <em>et</em> ta famille.
            </strong>{" "}
            Sans jargon, sans peur, sans expert.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up"
            style={{ animationDelay: "420ms" }}
          >
            <Link
              href="/inscription"
              className="btn-primary text-lg px-8 py-4 animate-glow"
            >
              Créer mon compte gratuit
            </Link>
            <Link href="/tarifs" className="btn-secondary text-lg px-8 py-4">
              Voir les offres payantes
            </Link>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic text-center">
            Déjà inscrit ?{" "}
            <Link
              href="/connexion"
              className="underline text-accent-700 hover:text-accent-600"
            >
              Se connecter
            </Link>
          </p>

          <p
            className="text-sm text-gray-500 dark:text-gray-400 mt-4 italic animate-fadeIn"
            style={{ animationDelay: "540ms" }}
          >
            Sans carte bancaire · Déploiement en moins de 30 minutes ·
            Hébergé en France
          </p>

          <div
            className="mt-12 inline-flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-accent-500/30 shadow-sm animate-fadeIn"
            style={{ animationDelay: "660ms" }}
          >
            <span className="text-2xl" aria-hidden="true">
              🌿
            </span>
            <p className="text-sm text-gray-700 dark:text-gray-200 text-left">
              Pas encore prêt·e ? Faites une{" "}
              <Link
                href="/audit-flash"
                className="font-bold text-accent-700 dark:text-accent-300 underline-offset-4 hover:underline"
              >
                photo bienveillante de votre maturité cyber
              </Link>{" "}
              en 5 minutes - gratuit, sans email obligatoire.
            </p>
          </div>
        </div>
      </section>
    </HexBackdrop>
  );
}
