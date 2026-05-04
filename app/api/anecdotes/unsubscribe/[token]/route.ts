// SPDX-License-Identifier: AGPL-3.0-or-later
// Endpoint de desinscription one-click pour la newsletter Cyber-Anecdote.
// Compatible RFC 8058 (List-Unsubscribe-Post : One-Click).
// Repond a GET (lien classique) ET POST (one-click Gmail/Outlook).

import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { unsubscribeByToken } from "@/lib/anecdotes/subscriptions";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const res = await unsubscribeByToken(token);
  // Redirection vers une page de confirmation publique
  const url = new URL(
    res.ok
      ? `/anecdotes/unsubscribed?email=${encodeURIComponent(res.email ?? "")}`
      : `/anecdotes/unsubscribed?error=invalid`,
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  );
  redirect(url.pathname + url.search);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const res = await unsubscribeByToken(token);
  if (!res.ok) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  // RFC 8058 : repondre 200 sans body est suffisant pour le one-click
  return NextResponse.json({ ok: true });
}
