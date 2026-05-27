// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";
//
// Server actions pour /admin/phishing/lists.
// Create / update / soft-delete des PhishingRecipientList + import CSV.

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseRecipientCsv } from "@/lib/phishing/recipient-csv";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role === "LEARNER") {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

const MAX_CSV_SIZE_BYTES = 1_000_000; // 1 Mo, soit ~10k lignes max
const MAX_LINES = 10_000;

export async function createListFromCsv(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  listId?: string;
  imported?: number;
  skipped?: number;
}> {
  const session = await requireAdmin();
  const tenantId = session.user.tenantId as string;

  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const description = String(formData.get("description") ?? "")
    .trim()
    .slice(0, 500);
  const csvFile = formData.get("csvFile") as File | null;

  if (!name) return { ok: false, error: "missing_name" };
  if (!csvFile || csvFile.size === 0) {
    return { ok: false, error: "missing_csv" };
  }
  if (csvFile.size > MAX_CSV_SIZE_BYTES) {
    return { ok: false, error: "csv_too_large" };
  }

  const csvText = await csvFile.text();
  const parsed = parseRecipientCsv(csvText);

  if (parsed.totalLines > MAX_LINES) {
    return { ok: false, error: "too_many_lines" };
  }
  if (parsed.rows.length === 0) {
    return { ok: false, error: "no_valid_rows" };
  }

  // Match les emails contre les Users existants du tenant (lookup batch).
  // Si un email match un User en BDD, on lie userId. Sinon recipient externe.
  const emails = parsed.rows.map((r) => r.email);
  const matchedUsers = await db.user.findMany({
    where: {
      tenantId,
      email: { in: emails },
    },
    select: { id: true, email: true },
  });
  const userByEmail = new Map(
    matchedUsers.map((u) => [u.email.toLowerCase(), u.id]),
  );

  // Cree la liste + les entries en une transaction
  const list = await db.$transaction(async (tx) => {
    const created = await tx.phishingRecipientList.create({
      data: {
        tenantId,
        name,
        description: description.length > 0 ? description : null,
      },
    });
    await tx.phishingRecipientListEntry.createMany({
      data: parsed.rows.map((r) => ({
        listId: created.id,
        email: r.email,
        name: r.name,
        service: r.service,
        userId: userByEmail.get(r.email) ?? null,
      })),
    });
    return created;
  });

  revalidatePath("/admin/phishing/lists");

  return {
    ok: true,
    listId: list.id,
    imported: parsed.rows.length,
    skipped: parsed.skipped.length,
  };
}

export async function deleteList(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const tenantId = session.user.tenantId as string;
  const listId = String(formData.get("listId") ?? "").trim();

  if (!listId) return;

  await db.phishingRecipientList.updateMany({
    where: { id: listId, tenantId },
    data: { isActive: false },
  });

  revalidatePath("/admin/phishing/lists");
}
