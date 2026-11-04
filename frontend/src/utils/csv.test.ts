import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

const BOM = '﻿'
const lines = (csv: string) => csv.slice(BOM.length).split('\r\n')

describe('toCsv', () => {
  it('starts with a BOM and separates records with CRLF', () => {
    const csv = toCsv([{ a: 1 }, { a: 2 }])
    expect(csv.startsWith(BOM)).toBe(true)
    expect(csv.slice(BOM.length)).toBe('a\r\n1\r\n2')
  })

  it('returns only the BOM for no rows and no headers', () => {
    expect(toCsv([])).toBe(BOM)
  })

  it('writes just the header line for no rows with explicit headers', () => {
    expect(toCsv([], ['id', 'name'])).toBe(BOM + 'id,name')
  })

  it('quotes fields with a comma, quote, CR or LF and doubles inner quotes', () => {
    const [, row] = lines(toCsv([{ a: 'x,y', b: 'say "hi"', c: 'l1\nl2', d: 'plain' }]))
    expect(row).toBe('"x,y","say ""hi""","l1\nl2",plain')
  })

  it('keeps non-ASCII text as is', () => {
    expect(lines(toCsv([{ name: 'Nguyễn Văn Anh' }]))[1]).toBe('Nguyễn Văn Anh')
  })

  it('joins arrays and serialises objects', () => {
    const [, row] = lines(toCsv([{ tags: ['a', 'b'], meta: { k: 1 } }]))
    expect(row).toBe('"a, b","{""k"":1}"')
  })

  it('writes booleans and numbers, and null or undefined as empty', () => {
    const [, row] = lines(toCsv([{ a: true, b: 0, c: -1.5, d: null, e: undefined }]))
    expect(row).toBe('true,0,-1.5,,')
  })

  it('neutralises formula prefixes in strings but not in numbers', () => {
    const [, row] = lines(toCsv([{ a: '=1+1', b: '+1', c: '-1', d: '@x', e: -1, f: ' =x' }]))
    expect(row.split(',')).toEqual(["'=1+1", "'+1", "'-1", "'@x", '-1', "' =x"])
  })

  it('neutralises a formula hidden in an array', () => {
    expect(lines(toCsv([{ a: ['=HYPERLINK("x")'] }]))[1]).toBe(`"'=HYPERLINK(""x"")"`)
  })

  it('does not touch a formula character in the middle of a value', () => {
    expect(lines(toCsv([{ a: 'a=b', b: 'x@y.z' }]))[1]).toBe('a=b,x@y.z')
  })

  it('uses the union of keys in first-seen order by default', () => {
    expect(lines(toCsv([{ b: 1 }, { a: 2, b: 3 }]))).toEqual(['b,a', '1,', '3,2'])
  })

  it('follows explicit headers, ignoring keys not listed', () => {
    expect(lines(toCsv([{ a: 1, b: 2, c: 3 }], ['c', 'a']))).toEqual(['c,a', '3,1'])
  })

  it('escapes header names like any other field', () => {
    expect(lines(toCsv([], ['Full name, first', '=cmd']))[0]).toBe(`"Full name, first",'=cmd`)
  })
})
