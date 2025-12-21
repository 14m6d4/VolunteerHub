import jwt from 'jsonwebtoken';
import { type ITokenPayload, type IUser } from '../types/user.ts';
import dotenv from "dotenv";
dotenv.config();
const JWT_SECRET: string = process.env.JWT_SECRET || 'secret123';

const ACCESS_TOKEN_EXPIRATION = '1d';

const REFRESH_TOKEN_EXPIRATION = '7d';


export function createAccessToken(payload: ITokenPayload): string {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRATION,
  });

  return accessToken;
}


export function createRefreshToken(payload: ITokenPayload): string {
  const refreshToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRATION,
  });

  return refreshToken;
}


export function verifyToken(token: string): ITokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ITokenPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token.');
  }
}

export function generateAuthToken(user: IUser): string {
  const payload: ITokenPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  return createAccessToken(payload);
}