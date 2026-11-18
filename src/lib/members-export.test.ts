import { describe, expect, test } from "bun:test";

import { parseMembersFilters } from "@/lib/members";
import {
  MEMBERS_EXPORT_PATH,
  buildMemberExportHref,
  defaultMemberExportFieldKeys,
  parseMemberExportParams,
} from "@/lib/members-export";

describe("member export params", () => {
  test("falls back to defaults for missing or invalid values", () => {
    expect(
      parseMemberExportParams(
        new URLSearchParams("format=pdf&scope=nope&fields=bogus"),
      ),
    ).toEqual({
      emailsOnly: false,
      fields: defaultMemberExportFieldKeys,
      format: "csv",
      scope: "all",
    });
  });

  test("keeps known fields in definition order without duplicates", () => {
    const options = parseMemberExportParams(
      new URLSearchParams(
        "format=xlsx&scope=filtered&emailsOnly=1&fields=roles&fields=firstName&fields=roles&fields=bogus",
      ),
    );

    expect(options).toEqual({
      emailsOnly: true,
      fields: ["firstName", "roles"],
      format: "xlsx",
      scope: "filtered",
    });
  });
});

describe("member export href", () => {
  const filters = parseMembersFilters({
    page: "3",
    pageSize: "100",
    q: "ana",
    region: ["Gorenjska"],
    status: "disabled",
  });

  test("omits table filters when exporting all members", () => {
    const href = buildMemberExportHref(
      { emailsOnly: false, fields: ["firstName"], format: "csv", scope: "all" },
      filters,
    );

    expect(href).toBe(
      `${MEMBERS_EXPORT_PATH}?format=csv&scope=all&fields=firstName`,
    );
  });

  test("includes filters but not pagination for the filtered view", () => {
    const href = buildMemberExportHref(
      {
        emailsOnly: true,
        fields: ["firstName"],
        format: "xlsx",
        scope: "filtered",
      },
      filters,
    );
    const params = new URL(href, "http://localhost").searchParams;

    expect(params.get("emailsOnly")).toBe("1");
    expect(params.getAll("fields")).toEqual([]);
    expect(params.get("q")).toBe("ana");
    expect(params.get("status")).toBe("disabled");
    expect(params.getAll("region")).toEqual(["Gorenjska"]);
    expect(params.has("page")).toBe(false);
    expect(params.has("pageSize")).toBe(false);
  });
});
