/**
 * User input goes into ILIKE in a few places. Unescaped, % and _ are wildcards:
 * a filter bypass on a public, anonymous endpoint. Escaping turns the value back
 * into a literal substring.
 */
export const containsPattern = (value: string) => `%${String(value ?? '').replace(/[\\%_]/g, '\\$&')}%`;
