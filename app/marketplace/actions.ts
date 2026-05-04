"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { installModule, uninstallModule } from "@/lib/marketplace/install";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") throw new Error("forbidden");
  return {
    tenantId: session.user!.tenantId as string,
    userId: session.user!.id as string,
  };
}

export async function installModuleAction(moduleId: string) {
  const { tenantId, userId } = await requireAdmin();
  const r = await installModule({ tenantId, moduleId, installedById: userId });
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${moduleId}`);
  revalidatePath("/admin/modules");
  revalidatePath("/apprendre");
  return r;
}

export async function uninstallModuleAction(moduleId: string) {
  const { tenantId, userId } = await requireAdmin();
  const r = await uninstallModule({
    tenantId,
    moduleId,
    uninstalledById: userId,
  });
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${moduleId}`);
  revalidatePath("/admin/modules");
  revalidatePath("/apprendre");
  return r;
}
