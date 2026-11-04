import { describe, expect, it } from 'vitest'
import { secureUpdateProfileSchema } from './validators'

const parse = (data: unknown) => secureUpdateProfileSchema.safeParse(data)
const messages = (data: unknown) => {
  const result = parse(data)
  return result.success ? [] : result.error.issues.map((i) => i.message)
}

describe('secureUpdateProfileSchema', () => {
  it('accepts a single changed field', () => {
    expect(parse({ name: 'Anh Nguyen' }).success).toBe(true)
    expect(parse({ notificationsEnabled: false }).success).toBe(true)
  })

  it('rejects an empty update', () => {
    expect(messages({})).toEqual(['You did not change any information.'])
  })

  it('rejects an update that carries only the current password', () => {
    const result = parse({ currentPassword: 'secret123' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['currentPassword'])
  })

  it('enforces minimum lengths', () => {
    expect(messages({ username: 'ab' })).toContain('Tên người dùng phải có ít nhất 3 ký tự')
    expect(messages({ name: 'A' })).toContain('Họ tên phải có ít nhất 2 ký tự')
    expect(messages({ name: 'Anh', currentPassword: '12345' })).toContain('Invalid Password')
  })

  it.each([
    'https://example.com/avatar.png',
    'data:image/png;base64,iVBORw0KGgo=',
    '',
  ])('accepts profilePicture %j', (profilePicture) => {
    expect(parse({ profilePicture }).success).toBe(true)
  })

  it('rejects a profilePicture that is neither a URL nor an image data URI', () => {
    expect(parse({ profilePicture: 'not a url' }).success).toBe(false)
    expect(parse({ profilePicture: 'data:text/html;base64,PGI+' }).success).toBe(false)
    expect(parse({ profilePicture: 'javascript:alert(1)' }).success).toBe(false)
  })

  it('rejects wrong types', () => {
    expect(parse({ notifyOnMention: 'yes' }).success).toBe(false)
    expect(parse({ name: 42 }).success).toBe(false)
  })
})
