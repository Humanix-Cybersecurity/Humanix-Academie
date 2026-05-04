// Parser SCIM filter v2 minimal (RFC 7644 §3.4.2.2).
// On supporte uniquement les filtres simples qu'Entra et Okta utilisent en
// pratique pour le provisioning :
//   userName eq "value"
//   externalId eq "value"
//   id eq "value"
//   active eq true
//   meta.lastModified gt "2026-05-01T00:00:00Z"
//
// Les operateurs complexes (and/or, complexAttribute[...]), bracketing, ne sont
// pas supportes ici. On renvoie null si on ne sait pas parser et l'appelant
// retournera 400 invalidFilter.

export type SimpleFilter = {
  attribute: string;
  op: "eq" | "ne" | "co" | "sw" | "ew" | "gt" | "ge" | "lt" | "le" | "pr";
  value: string | number | boolean | null;
};

const RE_SIMPLE =
  /^\s*([A-Za-z][A-Za-z0-9_.:-]*)\s+(eq|ne|co|sw|ew|gt|ge|lt|le|pr)\s*(?:"((?:[^"\\]|\\.)*)"|(true|false|null|\d+(?:\.\d+)?))?\s*$/i;

export function parseScimFilter(raw: string | null): SimpleFilter | null {
  if (!raw) return null;
  const m = RE_SIMPLE.exec(raw);
  if (!m) return null;

  const [, attribute, opRaw, strValue, primValue] = m;
  const op = opRaw.toLowerCase() as SimpleFilter["op"];

  let value: string | number | boolean | null = null;
  if (op !== "pr") {
    if (strValue !== undefined) {
      value = strValue.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    } else if (primValue !== undefined) {
      if (primValue === "true") value = true;
      else if (primValue === "false") value = false;
      else if (primValue === "null") value = null;
      else value = Number(primValue);
    } else {
      return null; // operateur de comparaison sans valeur -> invalide
    }
  }

  return { attribute, op, value };
}

/**
 * Traduit un filtre SCIM simple en clause Prisma where pour User.
 * Retourne null si l'attribut ou l'operateur n'est pas supporte.
 */
export function filterToPrismaWhere(
  filter: SimpleFilter,
): Record<string, unknown> | null {
  const attr = filter.attribute.toLowerCase();

  // Mapping attribute SCIM -> champ Prisma
  const fieldMap: Record<string, string> = {
    username: "email",
    "emails.value": "email",
    externalid: "id",
    id: "id",
    displayname: "name",
    active: "isActive",
  };

  const field = fieldMap[attr];
  if (!field) return null;

  switch (filter.op) {
    case "eq":
      return { [field]: filter.value };
    case "ne":
      return { [field]: { not: filter.value } };
    case "co":
      if (typeof filter.value !== "string") return null;
      return { [field]: { contains: filter.value, mode: "insensitive" } };
    case "sw":
      if (typeof filter.value !== "string") return null;
      return { [field]: { startsWith: filter.value, mode: "insensitive" } };
    case "ew":
      if (typeof filter.value !== "string") return null;
      return { [field]: { endsWith: filter.value, mode: "insensitive" } };
    case "pr":
      return { [field]: { not: null } };
    default:
      return null;
  }
}
