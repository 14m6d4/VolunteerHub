import { describe, expect, it } from 'vitest'
import { cn, coverImageUrl, showCoverPlaceholder } from './utils'

describe('cn', () => {
  it('joins truthy classes and drops falsy ones', () => {
    expect(cn('a', false, null, undefined, 'b', { c: true, d: false })).toBe('a b c')
  })

  it('lets a later Tailwind class override a conflicting earlier one', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('text-red-500', ['text-blue-500'])).toBe('text-blue-500')
  })
})

describe('coverImageUrl', () => {
  it('keeps a stored cover', () => {
    expect(coverImageUrl('/uploads/abc.webp')).toBe('/uploads/abc.webp')
  })

  it.each([undefined, null, ''])('falls back to the placeholder for %j', (url) => {
    expect(coverImageUrl(url)).toBe('/event-cover-placeholder.svg')
  })
})

describe('showCoverPlaceholder', () => {
  const fire = (src: string) => {
    const img = { src }
    showCoverPlaceholder({ currentTarget: img } as unknown as React.SyntheticEvent<HTMLImageElement>)
    return img.src
  }

  it('swaps a broken image for the placeholder', () => {
    expect(fire('http://localhost/uploads/missing.webp')).toBe('/event-cover-placeholder.svg')
  })

  it('leaves the placeholder alone, so a broken placeholder cannot loop', () => {
    // Browsers report src as an absolute URL.
    expect(fire('http://localhost/event-cover-placeholder.svg')).toBe('http://localhost/event-cover-placeholder.svg')
  })
})
