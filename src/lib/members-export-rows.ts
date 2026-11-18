import {
  memberExportFields,
  type MemberExportFieldKey,
} from "@/lib/members-export";
import type { MemberExportRecord } from "@/lib/members-query";

const EXPORT_TIME_ZONE = "Europe/Ljubljana";
const LIST_SEPARATOR = "; ";

// sv-SE formats as ISO-like "yyyy-MM-dd HH:mm", which sorts well in spreadsheets.
const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
  day: "2-digit",
  month: "2-digit",
  timeZone: EXPORT_TIME_ZONE,
  year: "numeric",
});
const dateTimeFormatter = new Intl.DateTimeFormat("sv-SE", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  timeZone: EXPORT_TIME_ZONE,
  year: "numeric",
});

function formatDate(value: Date | null) {
  return value ? dateFormatter.format(value) : "";
}

function formatDateTime(value: Date | null) {
  return value ? dateTimeFormatter.format(value) : "";
}

function joinNames(values: ReadonlyArray<{ name: string }>) {
  return values.map((value) => value.name).join(LIST_SEPARATOR);
}

const fieldValueGetters: Record<
  MemberExportFieldKey,
  (member: MemberExportRecord) => string
> = {
  addresses: (member) =>
    member.addresses
      .map(
        (address) =>
          `${address.label}: ${address.street}, ${address.postalCode} ${address.city}, ${address.country}`,
      )
      .join(LIST_SEPARATOR),
  allEmails: (member) => member.emails.join(LIST_SEPARATOR),
  applications: (member) => joinNames(member.applications),
  dateOfBirth: (member) => member.dateOfBirth ?? "",
  disabledAt: (member) => formatDateTime(member.disabledAt),
  discordUserId: (member) => member.discordUserId ?? "",
  firstName: (member) => member.firstName,
  fullLegalName: (member) => member.fullLegalName,
  groups: (member) => joinNames(member.groups),
  id: (member) => member.id,
  joinedAt: (member) => formatDate(member.createdAt),
  keycloakId: (member) => member.keycloakId,
  lastName: (member) => member.lastName,
  membershipExpiresAt: (member) => {
    if (!member.currentMembership) return "";
    if (!member.currentMembership.expiresAt) return "Indefinite";
    return formatDate(member.currentMembership.expiresAt);
  },
  notes: (member) => member.notes ?? "",
  phones: (member) => member.phones.join(LIST_SEPARATOR),
  placeOfBirth: (member) => member.placeOfBirth ?? "",
  primaryEmail: (member) => member.primaryEmail ?? "",
  residenceRegion: (member) => member.residenceRegion ?? "",
  roles: (member) => joinNames(member.roles),
  status: (member) => (member.disabledAt ? "Disabled" : "Active"),
  username: (member) => member.username,
};

/** Header row followed by one row per member, limited to the selected fields. */
export function buildMemberExportTable(
  members: ReadonlyArray<MemberExportRecord>,
  fields: ReadonlyArray<MemberExportFieldKey>,
): Array<Array<string>> {
  const labels = new Map<string, string>(
    memberExportFields.map((field) => [field.key, field.label]),
  );

  return [
    fields.map((field) => labels.get(field) ?? field),
    ...members.map((member) =>
      fields.map((field) => fieldValueGetters[field](member)),
    ),
  ];
}
