// Vérifie rapidement que toutes les evidences du folder Humanix Académie
// dans CISO Assistant ont bien un attachment PDF.
// Usage : docker exec humanix-app npx tsx scripts/check-ciso-attachments.ts

async function main() {
  const baseUrl = process.env.CISO_BASE_URL ?? "http://backend:8000";
  const username = process.env.CISO_USERNAME ?? "admin@humanix-test.fr";
  const password = process.env.CISO_PASSWORD ?? "Password123!";
  const folderId =
    process.env.CISO_FOLDER_ID ?? "3a16f5af-8c88-49ca-8f7b-cb73ab169380";

  const login = await fetch(`${baseUrl}/api/iam/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const { token } = (await login.json()) as { token: string };
  const r = await fetch(`${baseUrl}/api/evidences/?folder=${folderId}`, {
    headers: { Authorization: `Token ${token}` },
  });
  const data = (await r.json()) as any;
  const items: any[] = data.results ?? data ?? [];
  let withAtt = 0;
  for (const e of items) {
    const hasAtt = !!e.attachment;
    if (hasAtt) withAtt += 1;
    console.log(
      `${(e.name ?? "(no name)").slice(0, 55).padEnd(55)} ` +
        `attachment=${hasAtt ? "✓ " + String(e.attachment).slice(-40) : "✗ AUCUN"} ` +
        `link=${(e.link ?? "").slice(0, 40)}`,
    );
  }
  console.log(`\nTotal : ${withAtt}/${items.length} evidences avec PDF attaché`);
}
main().catch(console.error);
