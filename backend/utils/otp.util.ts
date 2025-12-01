// backend/utils/otp.util.ts

import crypto from 'crypto';

/**
 * Generates a random 6-digit verification code (OTP).
 * @returns 6-digit string code
 */
export function generateOTP(): string {
  // Generate a random 6-digit number
  const otp = crypto.randomInt(100000, 1000000).toString(); 
  return otp;
}

/**
 * Calculates the expiration time for the OTP (e.g., 10 minutes from now).
 * @param minutes - Minutes until expiration
 * @returns Date object for expiration
 */
export function getOTPExpiration(minutes: number = 10): Date {
  const expirationTime = new Date();
  expirationTime.setMinutes(expirationTime.getMinutes() + minutes);
  return expirationTime;
}