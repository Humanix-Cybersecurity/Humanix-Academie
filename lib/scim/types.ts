// SPDX-License-Identifier: AGPL-3.0-or-later
// Types SCIM v2 (RFC 7643 - Schema, RFC 7644 - Protocol).
// Implementation pragmatique : on ne couvre que les schemas core (User, Group)
// + une extension custom Humanix (role, service, plan).

export const SCIM_SCHEMAS = {
  USER: "urn:ietf:params:scim:schemas:core:2.0:User",
  GROUP: "urn:ietf:params:scim:schemas:core:2.0:Group",
  ENTERPRISE_USER: "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User",
  HUMANIX_USER: "urn:humanix:scim:schemas:extension:User:1.0",
  LIST_RESPONSE: "urn:ietf:params:scim:api:messages:2.0:ListResponse",
  ERROR: "urn:ietf:params:scim:api:messages:2.0:Error",
  PATCH_OP: "urn:ietf:params:scim:api:messages:2.0:PatchOp",
  SERVICE_PROVIDER_CONFIG:
    "urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig",
  RESOURCE_TYPE: "urn:ietf:params:scim:schemas:core:2.0:ResourceType",
} as const;

export type ScimMeta = {
  resourceType: "User" | "Group";
  created: string;
  lastModified: string;
  location?: string;
  version?: string;
};

export type ScimEmail = {
  value: string;
  primary?: boolean;
  type?: "work" | "home" | "other";
  display?: string;
};

export type ScimName = {
  formatted?: string;
  familyName?: string;
  givenName?: string;
  middleName?: string;
};

export type ScimUser = {
  schemas: string[];
  id: string;
  externalId?: string;
  userName: string;
  name?: ScimName;
  displayName?: string;
  emails?: ScimEmail[];
  active: boolean;
  meta: ScimMeta;
  // Extension enterprise
  [key: string]: unknown;
};

export type ScimGroup = {
  schemas: string[];
  id: string;
  displayName: string;
  members?: { value: string; display?: string; type?: "User" | "Group" }[];
  meta: ScimMeta;
};

export type ScimListResponse<T> = {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
};

export type ScimError = {
  schemas: string[];
  status: string; // string en SCIM
  scimType?:
    | "invalidFilter"
    | "tooMany"
    | "uniqueness"
    | "mutability"
    | "invalidSyntax"
    | "invalidPath"
    | "noTarget"
    | "invalidValue"
    | "invalidVers"
    | "sensitive";
  detail?: string;
};

export type ScimPatchOp = {
  schemas: string[];
  Operations: {
    op: "add" | "remove" | "replace" | "Add" | "Remove" | "Replace";
    path?: string;
    value?: unknown;
  }[];
};

export function scimError(
  status: number,
  detail: string,
  scimType?: ScimError["scimType"],
): ScimError {
  return {
    schemas: [SCIM_SCHEMAS.ERROR],
    status: String(status),
    ...(scimType && { scimType }),
    detail,
  };
}
