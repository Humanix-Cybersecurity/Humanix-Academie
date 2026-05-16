// SPDX-License-Identifier: AGPL-3.0-or-later
// Dispatcher : selon le type du media, rend le bon composant Mockup.
//
// Server component (pas de state interne) — peut etre rendu cote
// serveur dans le player. On garde les mockups separes pour les
// rendre testables/extensibles independamment.

import EmailMockup from "./EmailMockup";
import LinkedInMockup from "./LinkedInMockup";
import PhotoOfficeMockup from "./PhotoOfficeMockup";
import SmsMockup from "./SmsMockup";
import FacebookMockup from "./FacebookMockup";
import XProfileMockup from "./XProfileMockup";
import InstagramProfileMockup from "./InstagramProfileMockup";
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
    case "sms-mockup":
      return <SmsMockup media={media} />;
    case "facebook-mockup":
      return <FacebookMockup media={media} />;
    case "x-profile-mockup":
      return <XProfileMockup media={media} />;
    case "instagram-profile-mockup":
      return <InstagramProfileMockup media={media} />;
  }
}
