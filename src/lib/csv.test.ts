import { describe, expect, test } from "bun:test";

import { escapeCsvField, toCsvDocument, toCsvRow } from "@/lib/csv";

describe("csv helpers", () => {
  test("escapes quotes, commas and newlines", () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField("a,b")).toBe('"a,b"');
    expect(escapeCsvField("line\nbreak")).toBe('"line\nbreak"');
    expect(escapeCsvField("plain")).toBe("plain");
  });

  test("renders null and undefined as empty fields", () => {
    expect(toCsvRow([null, undefined, "x"])).toBe(",,x");
  });

  test("builds a CRLF document with an optional BOM", () => {
    expect(toCsvDocument([["a"], ["č"]])).toBe("﻿a\r\nč\r\n");
    expect(toCsvDocument([["a"]], { bom: false })).toBe("a\r\n");
    expect(toCsvDocument([])).toBe("");
  });
});
