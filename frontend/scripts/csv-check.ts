/**
 * Checks the admin CSV export helper against RFC 4180 and formula injection.
 * Plain Node strips the types, so no test framework is needed.
 *
 * Run with: npm run check:csv
 */
import assert from 'node:assert/strict';
import { toCsv } from '../src/utils/csv.ts';

const BOM = '﻿';
const lines = (csv: string) => csv.slice(BOM.length).split('\r\n');

// A description with a comma, a quote and a newline stays one field.
const events = [
  { id: 'e1', title: 'Beach clean-up', description: 'Bring gloves, bags\nand a "can-do" attitude', tags: ['beach', 'environment'], capacity: 20 },
];
assert.equal(
  toCsv(events),
  BOM + 'id,title,description,tags,capacity\r\n' +
    'e1,Beach clean-up,"Bring gloves, bags\nand a ""can-do"" attitude","beach, environment",20',
);

// Formula characters open as text; numbers are left alone.
const formulas = [{ a: '=1+1', b: '+33 123', c: '-cmd', d: '@SUM(A1)', e: -5, f: 'safe' }];
assert.deepEqual(lines(toCsv(formulas))[1]!.split(','), ["'=1+1", "'+33 123", "'-cmd", "'@SUM(A1)", '-5', 'safe']);

// Every row follows the header order; a missing key or null leaves an empty field.
const ragged = [{ a: 1, b: null }, { b: 'x', c: true }];
assert.deepEqual(lines(toCsv(ragged)), ['a,b,c', '1,,', ',x,true']);
assert.deepEqual(lines(toCsv(ragged, ['c', 'a'])), ['c,a', ',1', 'true,']);

assert.equal(toCsv([]), BOM);

console.log('CSV CHECK PASSED');
