import { z } from "zod";

import {
  DEFAULT_MEMBERS_PAGE_SIZE,
  buildMembersQueryString,
  type MembersListFilters,
} from "@/lib/members";

export const MEMBERS_EXPORT_PATH = "/api/admin/members/export";

export const memberExportFormats = ["csv", "xlsx"] as const;
export type MemberExportFormat = (typeof memberExportFormats)[number];

export const memberExportScopes = ["all", "filtered"] as const;
export type MemberExportScope = (typeof memberExportScopes)[number];

export const memberExportFieldGroups = [
  "Identity",
  "Contact",
  "Personal",
  "Membership",
  "Access",
  "Other",
] as const;
export type MemberExportFieldGroup = (typeof memberExportFieldGroups)[number];

export const memberExportFields = [
  {
    key: "firstName",
    label: "First name",
    group: "Identity",
    defaultSelected: true,
  },
  {
    key: "lastName",
    label: "Last name",
    group: "Identity",
    defaultSelected: true,
  },
  {
    key: "fullLegalName",
    label: "Full legal name",
    group: "Identity",
    defaultSelected: false,
  },
  {
    key: "username",
    label: "Username",
    group: "Identity",
    defaultSelected: true,
  },
  { key: "id", label: "Member ID", group: "Identity", defaultSelected: false },
  {
    key: "keycloakId",
    label: "Keycloak ID",
    group: "Identity",
    defaultSelected: false,
  },
  {
    key: "primaryEmail",
    label: "Primary email",
    group: "Contact",
    defaultSelected: true,
  },
  {
    key: "allEmails",
    label: "All emails",
    group: "Contact",
    defaultSelected: false,
  },
  {
    key: "phones",
    label: "Phone numbers",
    group: "Contact",
    defaultSelected: false,
  },
  {
    key: "discordUserId",
    label: "Discord user ID",
    group: "Contact",
    defaultSelected: false,
  },
  {
    key: "addresses",
    label: "Addresses",
    group: "Contact",
    defaultSelected: false,
  },
  {
    key: "dateOfBirth",
    label: "Date of birth",
    group: "Personal",
    defaultSelected: false,
  },
  {
    key: "placeOfBirth",
    label: "Place of birth",
    group: "Personal",
    defaultSelected: false,
  },
  {
    key: "residenceRegion",
    label: "Region",
    group: "Personal",
    defaultSelected: true,
  },
  {
    key: "status",
    label: "Status",
    group: "Membership",
    defaultSelected: true,
  },
  {
    key: "joinedAt",
    label: "Date joined",
    group: "Membership",
    defaultSelected: true,
  },
  {
    key: "disabledAt",
    label: "Disabled at",
    group: "Membership",
    defaultSelected: false,
  },
  {
    key: "membershipExpiresAt",
    label: "Membership expires",
    group: "Membership",
    defaultSelected: false,
  },
  { key: "roles", label: "Roles", group: "Access", defaultSelected: true },
  { key: "groups", label: "Groups", group: "Access", defaultSelected: false },
  {
    key: "applications",
    label: "Applications",
    group: "Access",
    defaultSelected: false,
  },
  { key: "notes", label: "Notes", group: "Other", defaultSelected: false },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  group: MemberExportFieldGroup;
  defaultSelected: boolean;
}>;

export type MemberExportFieldKey = (typeof memberExportFields)[number]["key"];

const fieldKeys: ReadonlyArray<string> = memberExportFields.map(
  (field) => field.key,
);

export const defaultMemberExportFieldKeys: Array<MemberExportFieldKey> =
  memberExportFields
    .filter((field) => field.defaultSelected)
    .map((field) => field.key);

function isMemberExportFieldKey(value: string): value is MemberExportFieldKey {
  return fieldKeys.includes(value);
}

/** Keeps only known keys, deduplicated and in definition order. */
export function normalizeMemberExportFields(
  values: ReadonlyArray<string>,
): Array<MemberExportFieldKey> {
  const requested = new Set(values.filter(isMemberExportFieldKey));
  return memberExportFields
    .map((field) => field.key)
    .filter((key) => requested.has(key));
}

export type MemberExportOptions = {
  emailsOnly: boolean;
  fields: Array<MemberExportFieldKey>;
  format: MemberExportFormat;
  scope: MemberExportScope;
};

const exportParamsSchema = z.object({
  emailsOnly: z
    .enum(["1", "true"])
    .optional()
    .catch(undefined)
    .transform((value) => value !== undefined),
  format: z.enum(memberExportFormats).catch("csv"),
  scope: z.enum(memberExportScopes).catch("all"),
});

export function parseMemberExportParams(
  searchParams: URLSearchParams,
): MemberExportOptions {
  const { emailsOnly, format, scope } = exportParamsSchema.parse({
    emailsOnly: searchParams.get("emailsOnly") ?? undefined,
    format: searchParams.get("format") ?? undefined,
    scope: searchParams.get("scope") ?? undefined,
  });
  const fields = normalizeMemberExportFields(searchParams.getAll("fields"));

  return {
    emailsOnly,
    fields: fields.length ? fields : defaultMemberExportFieldKeys,
    format,
    scope,
  };
}

export function buildMemberExportHref(
  options: MemberExportOptions,
  filters: MembersListFilters,
) {
  const params = new URLSearchParams();
  params.set("format", options.format);
  params.set("scope", options.scope);

  if (options.emailsOnly) {
    params.set("emailsOnly", "1");
  } else {
    for (const field of options.fields) params.append("fields", field);
  }

  if (options.scope === "filtered") {
    const filterParams = new URLSearchParams(
      buildMembersQueryString({
        ...filters,
        page: 1,
        pageSize: DEFAULT_MEMBERS_PAGE_SIZE,
      }),
    );
    for (const [key, value] of filterParams) params.append(key, value);
  }

  return `${MEMBERS_EXPORT_PATH}?${params.toString()}`;
}
