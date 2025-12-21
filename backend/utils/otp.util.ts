import crypto from 'crypto';


export function generateOTP(): string {
  const otp = crypto.randomInt(100000, 1000000).toString();
  return otp;
}

export function getOTPExpiration(minutes: number = 10): Date {
  const expirationTime = new Date();
  expirationTime.setMinutes(expirationTime.getMinutes() + minutes);
  return expirationTime;
}