// Endpoint manuel SUPERADMIN pour relancer le scrape des fuites de données.
// Réservé à l'admin Humanix (contact@humanix-cybersecurity.fr).

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refreshBreaches } from "@/lib/breaches/repository";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = session.user!.role;
  if (role !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await refreshBreaches();
  return NextResponse.json(result);
}
