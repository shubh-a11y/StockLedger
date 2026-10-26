/**
 * CSV generation helpers shared by the export endpoint and unit tests.
 *
 * Formulas are a real export risk: a product name such as `=HYPERLINK(...)`
 * would execute when the file is opened in a spreadsheet. Cells starting with
 * a formula trigger are prefixed with an apostrophe, and quoting/escaping is
 * applied per RFC 4180.
 */

const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

export type CsvValue = string | number | null | undefined;

export function escapeCsvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let raw = String(value);
  if (FORMULA_TRIGGERS.some((trigger) => raw.startsWith(trigger))) {
    raw = `'${raw}`;
  }
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function toCsv(headers: readonly string[], rows: ReadonlyArray<readonly CsvValue[]>): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  // Trailing newline keeps POSIX tools happy.
  return `${lines.join("\r\n")}\r\n`;
}

/** Filename safe header value, e.g. stockledger-stock-2026-10-27.csv */
export function csvFilename(prefix: string, date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  return `${prefix}-${stamp}.csv`;
}
