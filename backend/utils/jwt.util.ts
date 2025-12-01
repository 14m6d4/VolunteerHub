import jwt from 'jsonwebtoken';
import { type ITokenPayload } from '../types/user.ts'; // Use 'type' for type imports

// JWT secret key (should be loaded from environment variables)
// TODO: Load from process.env.JWT_SECRET
const JWT_SECRET = 'YOUR_SUPER_SECRET_KEY'; 

// Time until Access Token expires (e.g., 15 minutes)
const ACCESS_TOKEN_EXPIRATION = '15m'; 

// Time until Refresh Token expires (e.g., 7 days)
const REFRESH_TOKEN_EXPIRATION = '7d';

/**
 * Creates an Access Token (short-lived)
 * @param payload - Data to be encoded in the token
 * @returns Access Token string
 */
export function createAccessToken(payload: ITokenPayload): string {
  // Use payload to sign the token
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRATION,
  });

  return accessToken;
}

/**
 * Creates a Refresh Token (long-lived)
 * @param payload - Data to be encoded in the token
 * @returns Refresh Token string
 */
export function createRefreshToken(payload: ITokenPayload): string {
  // Use payload to sign the token
  const refreshToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRATION,
  });

  return refreshToken;
}

/**
 * Verifies and decodes a token
 * @param token - JWT string
 * @returns Decoded payload or throws error
 */
export function verifyToken(token: string): ITokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ITokenPayload;
    return decoded;
  } catch (error) {
    // If token is invalid (expired, wrong format, etc.), it throws an error
    throw new Error('Invalid or expired token.'); 
  }
}