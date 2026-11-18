import { format } from "date-fns";
import ExcelJS from "exceljs";
import type { NextRequest } from "next/server";

import { requirePermission } from "@/lib/auth/permissions";
import { toCsvDocument } from "@/lib/csv";
import { parseMembersFilters, type MembersSearchParams } from "@/lib/members";
import { parseMemberExportParams } from "@/lib/members-export";
import { buildMemberExportTable } from "@/lib/members-export-rows";
import {
  getMemberEmailsForExport,
  getMembersForExport,
} from "@/lib/members-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MIN_COLUMN_WIDTH = 10;
const MAX_COLUMN_WIDTH = 50;

function toMembersSearchParams(
  searchParams: URLSearchParams,
): MembersSearchParams {
  return {
    q: searchParams.get("q") ?? undefined,
    region: searchParams.getAll("region"),
    roleId: searchParams.getAll("roleId"),
    sort: searchParams.get("sort") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  };
}

async function buildXlsx(rows: Array<Array<string>>) {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("Members", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.addRows(rows);

  const header = worksheet.getRow(1);
  header.font = { bold: true };
  const columnCount = rows[0]?.length ?? 0;

  if (columnCount > 0) {
    worksheet.autoFilter = {
      from: { column: 1, row: 1 },
      to: { column: columnCount, row: 1 },
    };
  }

  for (let column = 0; column < columnCount; column++) {
    const longest = rows.reduce(
      (max, row) => Math.max(max, row[column]?.length ?? 0),
      0,
    );
    worksheet.getColumn(column + 1).width = Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(MIN_COLUMN_WIDTH, longest + 2),
    );
  }

  return workbook.xlsx.writeBuffer();
}

export async function GET(request: NextRequest) {
  await requirePermission("members.read");

  const searchParams = request.nextUrl.searchParams;
  const options = parseMemberExportParams(searchParams);
  const filters =
    options.scope === "filtered"
      ? parseMembersFilters(toMembersSearchParams(searchParams))
      : null;

  let rows: Array<Array<string>>;
  let includeCsvHeader = true;

  if (options.emailsOnly) {
    const emails = await getMemberEmailsForExport(filters);
    rows = [["Email"], ...emails.map((email) => [email])];
    // Match the existing applications emails export: plain list, no header.
    includeCsvHeader = false;
  } else {
    const members = await getMembersForExport(filters);
    rows = buildMemberExportTable(members, options.fields);
  }

  const baseName = options.emailsOnly ? "member-emails" : "members";
  const filename = `${baseName}-${format(new Date(), "yyyy-MM-dd")}.${options.format}`;
  const headers = {
    "Cache-Control": "no-store",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };

  if (options.format === "xlsx") {
    const buffer = await buildXlsx(rows);
    return new Response(buffer, {
      headers: { ...headers, "Content-Type": XLSX_CONTENT_TYPE },
      status: 200,
    });
  }

  const csvRows = includeCsvHeader ? rows : rows.slice(1);
  return new Response(toCsvDocument(csvRows, { bom: includeCsvHeader }), {
    headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    status: 200,
  });
}
