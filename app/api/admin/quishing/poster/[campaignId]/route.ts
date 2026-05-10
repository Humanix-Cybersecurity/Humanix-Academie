// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /api/admin/quishing/poster/[campaignId]
//
// Genere un PDF d'affiches a imprimer pour une campagne quishing.
// 1 page A4 par destinataire avec son QR code unique.
//
// Auth : ADMIN, RSSI, MANAGER (lecture), SUPERADMIN
// Tenant scope : un admin ne peut telecharger que les posters de SES
// campagnes (cross-tenant impossible).

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  renderQuishingPosterBuffer,
  type PosterRecipient,
} from "@/lib/quishing/poster-pdf";
import {
  QUISHING_TEMPLATES,
  type QuishingTemplate,
} from "@/lib/phishing/qr-code";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // generation PDF + N QR codes peut prendre 10-30s

export async function GET(
  _req: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  const { campaignId } = await context.params;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (
    role !== "ADMIN" &&
    role !== "MANAGER" &&
    role !== "RSSI" &&
    role !== "SUPERADMIN"
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantId = session.user.tenantId as string;

  const campaign = await db.phishingCampaign.findUnique({
    where: { id: campaignId },
    include: {
      results: {
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { sentAt: "asc" },
      },
    },
  });

  if (!campaign || campaign.tenantId !== tenantId) {
    return NextResponse.json(
      { error: "campaign_not_found" },
      { status: 404 },
    );
  }
  if (campaign.channel !== "QUISHING") {
    return NextResponse.json(
      { error: "not_a_quishing_campaign" },
      { status: 400 },
    );
  }

  const tpl = QUISHING_TEMPLATES[campaign.template as QuishingTemplate];
  if (!tpl) {
    return NextResponse.json(
      { error: "invalid_template" },
      { status: 500 },
    );
  }

  const recipients: PosterRecipient[] = campaign.results.map((r) => ({
    trackToken: r.trackToken,
    userName: r.user.name,
    userEmail: r.user.email,
  }));

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "no_recipients" },
      { status: 400 },
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr";

  // Render le PDF (genere les QR codes localement via lib qrcode + assemble
  // le Document react-pdf, le tout dans poster-pdf.tsx car on ne peut pas
  // utiliser de JSX dans un route.ts handler Next.js).
  const buffer = await renderQuishingPosterBuffer({
    templateId: campaign.template as QuishingTemplate,
    recipients,
    baseUrl,
    campaignId: campaign.id,
  });

  // Audit log : qui a telecharge quoi
  await db.event
    .create({
      data: {
        tenantId,
        userId: session.user.id ?? null,
        type: "quishing_poster_downloaded",
        payload: {
          campaignId,
          template: campaign.template,
          recipientsCount: recipients.length,
        },
      },
    })
    .catch(() => {
      // best-effort
    });

  const today = new Date().toISOString().slice(0, 10);
  const filename = `humanix-quishing-${campaign.template.toLowerCase()}-${today}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
