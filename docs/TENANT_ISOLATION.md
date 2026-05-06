# Isolation tenant - invariants et audit

> Document à lire **avant** d'écrire toute nouvelle route, server action ou
> requête Prisma touchant des données scopées tenant.

## Pourquoi c'est critique

Humanix Académie est multi-tenant : un seul code, un seul schéma, plusieurs
clients dans la même base. Une régression silencieuse - une route qui oublie
le filtre `tenantId` - = fuite massive entre clients. C'est le risque #1 d'un
SaaS B2B et il s'introduit en quelques caractères.

## L'invariant à respecter

> **Toute requête Prisma sur un modèle `tenant-scoped` doit filtrer par
> `tenantId` - soit dans le `where`, soit via une chaîne de relations
> garantissant cette isolation.**

Modèles tenant-scoped (cf. `prisma/schema.prisma`) :
- `User`, `Group`, `UserGroup`
- `Progress`, `Event`, `TeamChallenge`
- `TenantSaisonConfig`, `Saison` (si `tenantId != null`)
- `PhishingCampaign`, `PhishingResult`
- `IncidentResponse`, `IncidentAction`, `IncidentTimeline`
- `MarketplaceInstallation`
- `NotificationLog`, `TenantWebhook`
- `FamilyInvite`
- `ApiKey`
- `AuditLog` (sauf SUPERADMIN cross-tenant)
- `BillingEvent`
- `WebAuthnCredential` (via `userId` qui implique `tenantId`)

Modèles **NON** tenant-scoped (catalogue global) :
- `Tenant` (lui-même)
- `Saison` (si `tenantId == null` → catalogue commun)
- `Episode`, `ShopItem`, `LibraryArticle`
- `MarketplaceModule` (catalogue partagé, modéré globalement)
- `WeeklyAnecdote`, `AnecdoteSubscription`
- `DataBreach`, `AuditFlashSubmission`
- `ExpertProfile`
- `VerificationToken`, `Account`, `Session`, `PasswordResetToken`

## Patterns sûrs

### Server actions (préféré)

```ts
async function requireAdmin() {
  const session = await auth();
  // ...
  return { tenantId: session.user.tenantId, ... };
}

export async function deleteUser(userId: string) {
  const ctx = await requireAdmin();
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== ctx.tenantId) throw new Error("not_found");
  await db.user.delete({ where: { id: userId } });
}
```

**Toujours** vérifier `target.tenantId !== ctx.tenantId` après un `findUnique`.
Un attaquant qui passe l'ID d'un user d'un autre tenant doit recevoir un 404.

### Routes API server-side

```ts
const session = await auth();
const tenantId = session.user.tenantId;

// Patron A : where: { id, tenantId }
const incident = await db.incidentResponse.findFirst({
  where: { id, tenantId },
});
if (!incident) return notFound();
```

`findFirst` (et non `findUnique`) parce que `findUnique` n'accepte qu'une clé
unique. Le compose `id + tenantId` n'est pas unique côté schéma - `findFirst`
matche les deux.

### Routes API publiques avec API key

```ts
const a = await authenticateApiKey(req); // pose tenantId
const users = await db.user.findMany({
  where: { tenantId: a.tenantId },
});
```

La clé API est elle-même attachée à un tenant (cf. `ApiKey.tenantId`), donc
elle ne peut servir qu'à lire le tenant qui l'a émise.

### Pages super-admin (cross-tenant)

```ts
if (session.user.role !== "SUPERADMIN") redirect("/admin");
const tenants = await db.tenant.findMany(); // OK : SUPERADMIN voit tout
```

Le rôle SUPERADMIN est l'**unique exception** au filtre tenantId. Toute page
qui omet le filtre tenantId DOIT vérifier `role === "SUPERADMIN"` avant.

## Anti-patterns à proscrire

### ❌ findUnique sans vérif post-fetch

```ts
// MAUVAIS : un user peut récupérer n'importe quel id en passant n'importe
// quel id dans l'URL
const u = await db.user.findUnique({ where: { id: params.id } });
return NextResponse.json(u);
```

### ❌ findMany sans tenantId pour un modèle scoped

```ts
// MAUVAIS : retourne TOUS les users de TOUS les tenants
const users = await db.user.findMany({ where: { isActive: true } });
```

### ❌ deleteMany / updateMany sans tenantId

```ts
// MAUVAIS : peut effacer les progress de tous les tenants
await db.progress.deleteMany({ where: { score: 0 } });
```

## État de l'audit (à date de PR #92)

| Surface | Verdict |
|---|---|
| Server actions `app/admin/actions.ts` | ✅ filtre `tenantId !== ctx.tenantId` partout |
| Server actions sécurité `app/profil/securite/*` | ✅ scope par `userId` issu de la session |
| Routes `/api/v1/*` | ✅ `authenticateApiKey` pose tenantId |
| Routes `/api/admin/*` | ✅ vérifient role + tenantId session |
| Routes `/api/me/*` | ✅ filtre par `session.user.id` |
| Pages `/admin/[id]` (incidents) | ✅ `findFirst({ id, tenantId })` |
| Pages `/admin/[id]` (contributions) | ✅ filtre par `authorId === userId` |
| Pages `/admin/[id]` (moderation, anecdotes) | ✅ gating SUPERADMIN explicite (catalogue global) |
| Pages `/superadmin/*` | ✅ gating role + step-up WebAuthn |
| Routes `/api/webauthn/*` | ✅ scope par `userId` session ou email login |
| Routes `/api/stripe/webhook` | ✅ tenantId résolu depuis `metadata.tenantId` ou `stripeCustomerId` |
| Routes `/api/audit-flash/*` | N/A (table sans tenantId, leads pré-clients) |

**Pas de fuite cross-tenant identifiée à date.**

## Tests d'isolation à mettre en place

À ajouter dans une PR future (cf. action A29 dans
`00_ACTIONS_MANUELLES_REQUISES.md`) :

- Test Vitest : 2 tenants seedés, un user de chaque, tentatives croisées
  via les actions admin → vérifier que chaque tentative renvoie `not_found`
- Test Playwright bout-en-bout : connexion tenant A, tentative d'accès via
  URL aux pages `/admin/utilisateurs` du tenant B → vérifier que les
  données affichées sont bien celles de A uniquement

Une fois la CI relancée (runner billing actuellement bloqué), ces tests
doivent tourner à chaque PR.

## Que faire si vous ajoutez un nouveau modèle tenant-scoped

1. Ajouter `tenantId String` + relation `Tenant` avec `onDelete: Cascade`
2. Ajouter `@@index([tenantId])` au minimum
3. Mettre à jour la liste plus haut dans ce document
4. Vérifier que toutes les requêtes filtrent bien
5. Si possible : ajouter un test d'isolation Vitest dédié
