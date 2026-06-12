// SPDX-License-Identifier: AGPL-3.0-or-later
// Telechargement du certificat individuel de l'apprenant
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CertificateOfCompletion, certificateName } from "@/lib/pdf-certificate";
import { getLevel } from "@/lib/levels";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user!.id as string;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      tenant: { select: { name: true } },
      progress: {
        where: { status: "COMPLETED" },
        include: { episode: true, saison: true },
        orderBy: { completedAt: "desc" },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const totalXP = user.progress.reduce((s, p) => s + (p.score || 0), 0);
  const averageScore =
    user.progress.length === 0
      ? 0
      : Math.round(
          user.progress.reduce((s, p) => s + (p.score || 0), 0) /
            user.progress.length,
        );
  const level = getLevel(totalXP);

  // Prenom + nom reels si renseignes (option utilisateur), sinon pseudo.
  const displayName = certificateName(user);

  const buffer = await renderToBuffer(
    CertificateOfCompletion({
      recipientName: displayName,
      tenantName: user.tenant.name,
      totalEpisodes: user.progress.length,
      totalXP,
      averageScore,
      levelName: level.name,
      levelId: level.id,
      modules: user.progress.map((p) => ({
        title: p.episode.title,
        saisonTitle: p.saison.title,
        score: p.score ?? 0,
      })),
      generatedAt: new Date(),
    }),
  );

  const filename = `certificat-humanix-${(displayName || user.email).replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;

  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
