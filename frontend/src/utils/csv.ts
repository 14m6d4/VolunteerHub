// RFC 4180 CSV for the admin exports. Checked by scripts/csv-check.ts.

function field(value: unknown): string {
  if (value == null) return '';
  let text = Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value);
  // A leading =, +, - or @ runs as a formula in a spreadsheet; the ' makes it text.
  if (typeof value !== 'number' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Columns default to every key found in the rows, in first-seen order; a row
 * without a column gets an empty field there. The BOM makes Excel read UTF-8,
 * so Vietnamese names survive.
 */
export function toCsv<T extends object>(
  rows: T[],
  headers: readonly string[] = [...new Set(rows.flatMap(Object.keys))],
): string {
  const lines = [headers, ...rows.map(row => headers.map(h => (row as Record<string, unknown>)[h]))];
  return '﻿' + lines.map(line => line.map(field).join(',')).join('\r\n');
}
