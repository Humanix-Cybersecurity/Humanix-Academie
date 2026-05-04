// Tracking d'un partage d'article (badge ambassadeur)
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Format slug : lettres minuscules, chiffres, tirets uniquement (kebab-case).
// Évite les payloads malicieux (XSS via reflected URL, log injection, etc.)
const Schema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "invalid_slug_format"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: true, anonymous: true });
  const userId = session.user!.id as string;
  const tenantId = session.user!.tenantId as string | undefined;

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  const article = await db.libraryArticle.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (!article)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { shareCount: { increment: 1 } },
    }),
    db.libraryArticle.update({
      where: { id: article.id },
      data: { shareCount: { increment: 1 } },
    }),
    ...(tenantId
      ? [
          db.event.create({
            data: {
              tenantId,
              userId,
              type: "article_shared",
              payload: { slug: parsed.data.slug },
            },
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
