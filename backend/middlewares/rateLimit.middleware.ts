import { rateLimit } from 'express-rate-limit';

const minutes = (n: number) => n * 60 * 1000;

const shared = {
    standardHeaders: 'draft-8' as const,
    legacyHeaders: false,
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
