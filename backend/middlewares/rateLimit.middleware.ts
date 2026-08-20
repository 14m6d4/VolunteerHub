import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

const minutes = (n: number) => n * 60 * 1000;

/**
 * Identify the caller for rate-limiting purposes.
 *
 * X-Forwarded-For is not usable here. Cloudflare *appends* to it rather than
 * replacing it, so a value the client sent survives into the chain; trusting a
 * fixed number of hops therefore lets an attacker rotate the header and land in
 * a fresh bucket on every request, which defeats the limit entirely.
 *
 * CF-Connecting-IP is set by Cloudflare on every request and overwrites
 * whatever the client supplied, so it cannot be forged through the edge. We
 * fall back to req.ip (with trust proxy = 1, the address Traefik observed) when
 * the header is absent, which is the case in local development.
 *
 * Caveat: a request sent straight to the origin, bypassing Cloudflare, can
 * still set CF-Connecting-IP freely. Closing that requires restricting the
 * origin's :443 to Cloudflare's published ranges at the firewall.
 */
const clientKey = (req: Request): string => {
    const cf = req.headers['cf-connecting-ip'];
    const value = Array.isArray(cf) ? cf[0] : cf;
    // ipKeyGenerator normalises IPv6 to a subnet so a single client cannot walk
    // through its own /64 to get a new bucket each time.
    return ipKeyGenerator(value?.trim() || req.ip || 'unknown');
};

const shared = {
    standardHeaders: 'draft-8' as const,
    legacyHeaders: false,
    keyGenerator: clientKey,
    message: { status: 'fail', message: 'Too many requests. Please try again later.' },
};

/**
 * Login and registration. Generous enough that a person fumbling their password
 * is unaffected, tight enough that password spraying is not viable.
 */
export const authLimiter = rateLimit({
    ...shared,
    windowMs: minutes(15),
    limit: 20,
});

/**
 * OTP entry and password-reset requests. The OTP is six digits and lives for ten
 * minutes, so without a cap here the reset flow is a straightforward account
 * takeover: guess until it lands.
 */
export const otpLimiter = rateLimit({
    ...shared,
    windowMs: minutes(15),
    limit: 8,
});
