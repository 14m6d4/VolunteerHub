import { type Request, type Response, type NextFunction } from 'express';
import { loginUser, loginDemoUser, registerUser, verifyUserOTP, sendPasswordResetOtp, verifyPasswordResetOtp, resetPasswordWithOtp, getAuthenticatedUser, isSignupEnabled, type IAuthResponse } from '../services/auth.service.ts';
import { createAccessToken, verifyToken } from '../utils/jwt.util.ts';
import { type ITokenPayload } from '../types/user.ts';

const sendSignIn = (res: Response, authData: IAuthResponse) => {
  res.cookie('refreshToken', authData.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    accessToken: authData.accessToken,
    user: authData.user,
  });
};

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSignIn(res, await loginUser(req.body));
  } catch (error) {
    next(error);
  }
}

export async function demoLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSignIn(res, await loginDemoUser(req.body.role));
  } catch (error) {
    next(error);
  }
}

export function getConfig(_req: Request, res: Response): void {
  res.json({ success: true, data: { signupEnabled: isSignupEnabled() } });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userData = req.body;

    const newUser = await registerUser(userData);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully. Verification required.',
      data: {
        user: {
          id: newUser._id.toString(),
          email: newUser.email,
          role: newUser.role,
          name: newUser.name || newUser.username,
          isVerified: newUser.isVerified,
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, otp } = req.body;

    const verifiedUser = await verifyUserOTP(email, otp);

    const payload: ITokenPayload = { id: verifiedUser._id.toString(), email: verifiedUser.email, role: verifiedUser.role };
    const accessToken = createAccessToken(payload);

    res.status(200).json({
      status: 'success',
      message: 'Account verified successfully.',
      accessToken,
      user: { id: verifiedUser._id.toString(), email: verifiedUser.email, name: verifiedUser.name || verifiedUser.username, role: verifiedUser.role }
    });

  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ status: 'fail', message: 'Email is required.' });
      return;
    }

    await sendPasswordResetOtp(email);

    res.status(200).json({ status: 'success', message: 'If an account with that email exists, a reset code has been sent.' });
  } catch (error) {
    next(error);
  }
}

export async function verifyResetOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ status: 'fail', message: 'Email and otp are required.' });
      return;
    }

    await verifyPasswordResetOtp(email, otp);
    res.status(200).json({ status: 'success', message: 'OTP verified.' });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      res.status(400).json({ status: 'fail', message: 'Email, otp and password are required.' });
      return;
    }

    const user = await resetPasswordWithOtp(email, otp, password);

    res.status(200).json({ status: 'success', message: 'Password has been reset.' });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ status: 'fail', message: 'Authentication token missing.' });
      return;
    }

    const token = authHeader.split(' ')[1]!;
    let payload;
    try {
      payload = verifyToken(token);
    } catch (err: any) {
      res.status(401).json({ status: 'fail', message: 'Invalid or expired token.' });
      return;
    }

    const user = await getAuthenticatedUser(payload.id);

    res.status(200).json({
      status: 'success',
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        name: user.name,
        birthdate: user.birthdate ? new Date(user.birthdate).toISOString().split('T')[0] : undefined,
        profilePicture: user.profilePicture || undefined,
        role: user.role,
        authProvider: user.authProvider,
        isVerified: user.isVerified,
        isActive: user.isActive,
        isBanned: (user as any).isBanned || false,
        bannedReason: (user as any).bannedReason || undefined,
        bannedUntil: (user as any).bannedUntil || undefined,
      },
    });
  } catch (error) {
    next(error);
  }
}