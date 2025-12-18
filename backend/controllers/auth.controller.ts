import { type Request, type Response, type NextFunction } from 'express';
import { loginUser, registerUser, verifyUserOTP, sendPasswordResetOtp, verifyPasswordResetOtp, resetPasswordWithOtp, getAuthenticatedUser } from '../services/auth.service.ts'; 
import { createAccessToken, verifyToken } from '../utils/jwt.util.ts';
import { type ITokenPayload } from '../types/user.ts';
/**
 * Handles POST /api/auth/login endpoint
 * @param req - Request object
 * @param res - Response object
 * @param next - Next function for error forwarding
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Validation middleware should have ensured req.body is valid here

    const authData = await loginUser(req.body);

    // Set refresh token in HttpOnly cookie for security (optional but recommended)
    res.cookie('refreshToken', authData.refreshToken, {
      httpOnly: true, // Not accessible by client-side scripts
      secure: process.env.NODE_ENV === 'production', // Use secure in production (HTTPS)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matching token expiry)
    });

    // Return the access token and user info in the response body
    res.status(200).json({
      accessToken: authData.accessToken,
      user: authData.user,
    });
  } catch (error) {
    next(error);
  }
}

// ... other auth controller functions (register, logout, etc.)
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Validation middleware ensures body is valid
    const userData = req.body;
    
    // Call service logic to create user (newUser is IUserDocument without hash)
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

/**
 * POST /api/auth/forgot-password
 * Accepts { email } and sends a reset OTP if the account exists.
 * Responds 200 regardless to avoid leaking account existence.
 */
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

/**
 * POST /api/auth/verify-reset-otp
 * Accepts { email, otp } and verifies the reset OTP.
 */
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

/**
 * POST /api/auth/reset-password
 * Accepts { email, otp, password } and resets the user's password.
 */
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

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ status: 'fail', message: 'Authentication token missing.' });
      return;
    }

    const token = authHeader.split(' ')[1];
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
        role: user.role,
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

export const googleAuthCallback = (req: Request, res: Response, next: NextFunction) => {
    const payload = req.user as any;

    // If Passport returned a ban payload, redirect to a friendly banned page
    if (payload?.banned) {
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const redirectUrl = new URL(`${frontendUrl}/banned`);
      if (payload.reason) redirectUrl.searchParams.set('reason', payload.reason);
      if (payload.until) redirectUrl.searchParams.set('until', payload.until);

      console.log('[googleAuthCallback] User is banned, redirecting to:', redirectUrl.toString());
      return res.redirect(redirectUrl.toString());
    }

    const { token, user } = payload ?? {};

    if (!token) {
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=google_auth_failed`;
      return res.redirect(loginUrl);
    }

    // Strip trailing slash from FRONTEND_URL to avoid URL issues
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

    // Pass token as query parameter so frontend can capture and store it in localStorage
    const redirectUrl = new URL(frontendUrl);
    redirectUrl.searchParams.set('accessToken', token);
    if (user?.id) redirectUrl.searchParams.set('userId', user.id);

    console.log('[googleAuthCallback] Redirecting to:', redirectUrl.toString());
    res.redirect(redirectUrl.toString());
};