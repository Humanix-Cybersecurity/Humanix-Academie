// SPDX-License-Identifier: AGPL-3.0-or-later
// Dispatcher : selon le type du media, rend le bon composant Mockup.
//
// Server component (pas de state interne) — peut etre rendu cote
// serveur dans le player. On garde les mockups separes pour les
// rendre testables/extensibles independamment.

import EmailMockup from "./EmailMockup";
import LinkedInMockup from "./LinkedInMockup";
import PhotoOfficeMockup from "./PhotoOfficeMockup";
import type { Media } from "@/lib/investigations/types";

type Props = { media: Media };

export default function MediaMockup({ media }: Props) {
  switch (media.type) {
    case "email-mockup":
      return <EmailMockup media={media} />;
    case "linkedin-mockup":
      return <LinkedInMockup media={media} />;
    case "photo-office-mockup":
      return <PhotoOfficeMockup media={media} />;
    case "facebook-mockup":
    case "sms-mockup":
      // Sprint 2 : ajouter FacebookMockup + SmsMockup
      return (
        <div className="p-6 rounded-2xl border-2 border-amber-300 bg-amber-50 text-amber-900">
          <p className="font-bold">Type de média non encore implémenté</p>
          <p className="text-sm">
            Le composant {media.type} arrivera dans le Sprint 2 du Mode
            Enquêteur.
          </p>
        </div>
      );
  }
}
