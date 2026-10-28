const FORMULA_LEAD = /^[=+\-@]/;

function escapeField(value: unknown): string {
  let text: string;

  if (value === null || value === undefined) {
    text = '';
  } else if (Array.isArray(value)) {
    text = value.map(item => String(item)).join(', ');
  } else if (typeof value === 'object') {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }

  if (FORMULA_LEAD.test(text)) {
    text = `'${text}`;
  }

  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function toCsv<T extends object>(rows: readonly T[]): string {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]) as (keyof T)[];
  const lines = [headers.map(header => escapeField(header)).join(',')];

  for (const row of rows) {
    lines.push(headers.map(header => escapeField(row[header])).join(','));
  }

  return lines.join('\n');
}
