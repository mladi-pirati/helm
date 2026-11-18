export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue =
    value instanceof Date ? value.toISOString() : String(value);

  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function toCsvRow(values: ReadonlyArray<unknown>): string {
  return values.map(escapeCsvField).join(",");
}

/** Builds a UTF-8 CSV document with a BOM so Excel reads non-ASCII characters correctly. */
export function toCsvDocument(
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
  options: { bom?: boolean } = {},
): string {
  if (rows.length === 0) return "";
  const body = rows.map(toCsvRow).join("\r\n") + "\r\n";
  return (options.bom ?? true) ? "﻿" + body : body;
}
