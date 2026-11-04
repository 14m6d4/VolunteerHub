import { describe, expect, it } from 'vitest'
import { isDemoAccount } from './demo'

describe('isDemoAccount', () => {
  it('matches the demo domain in any case', () => {
    expect(isDemoAccount('demo-volunteer@demo.volunteerhub.test')).toBe(true)
    expect(isDemoAccount('Demo-Admin@DEMO.VolunteerHub.TEST')).toBe(true)
  })

  it('rejects other addresses, including look-alikes', () => {
    expect(isDemoAccount('user@example.com')).toBe(false)
    expect(isDemoAccount('user@demo.volunteerhub.test.evil.com')).toBe(false)
    expect(isDemoAccount('user@volunteerhub.test')).toBe(false)
  })

  it.each([null, undefined, ''])('is false for %j', (email) => {
    expect(isDemoAccount(email)).toBe(false)
  })
})
