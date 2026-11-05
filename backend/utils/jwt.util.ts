import jwt from 'jsonwebtoken';
import { type ITokenPayload, type IUser } from '../types/user.ts';
import dotenv from "dotenv";
dotenv.config();
const JWT_SECRET: string = process.env.JWT_SECRET as string;

// Fail at boot rather than signing every token with a constant that is public
// in this repository's history. A missing or misspelled JWT_SECRET would
// otherwise let anyone forge a token for any user.
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Refusing to start with an insecure fallback secret.');
}

const ACCESS_TOKEN_EXPIRATION = '1d';
const ACCESS_TOKEN_SECONDS = 24 * 60 * 60;
// Pinned so a token signed with any other algorithm is refused, whatever the
// library's defaults become.
const ALGORITHM = 'HS256';

const REFRESH_TOKEN_EXPIRATION = '7d';


export function createAccessToken(payload: ITokenPayload): string {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: ACCESS_TOKEN_EXPIRATION,
  });

  return accessToken;
}


// Marked so it can never pass as an access token (see verifyToken).
export function createRefreshToken(payload: ITokenPayload): string {
  const refreshToken = jwt.sign({ ...payload, typ: 'refresh' }, JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: REFRESH_TOKEN_EXPIRATION,
  });

  return refreshToken;
}


/**
 * Verifies an access token. The refresh token is signed with the same secret
 * and carries the same claims, so without the checks below it worked as a
 * Bearer token for seven days. Refused: anything marked as a refresh token, and
 * anything meant to live longer than an access token, which also covers the
 * refresh tokens issued before they were marked.
 */
export function verifyToken(token: string): ITokenPayload {
  // jwt.verify's own errors (TokenExpiredError, ...) pass through for the logs.
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [ALGORITHM] }) as jwt.JwtPayload;
  const { typ, iat, exp } = decoded;
  if (typ !== undefined || typeof iat !== 'number' || typeof exp !== 'number' || exp - iat > ACCESS_TOKEN_SECONDS) {
    throw new jwt.JsonWebTokenError('not an access token');
  }
  return decoded as unknown as ITokenPayload;
}

/** False once the user's token_version moved past the one the token was signed with. */
export const tokenVersionMatches = (payload: ITokenPayload, user: IUser) => (payload.tv ?? 0) === user.tokenVersion;

export function generateAuthToken(user: IUser): string {
  const payload: ITokenPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    tv: user.tokenVersion,
  };

  return createAccessToken(payload);
}