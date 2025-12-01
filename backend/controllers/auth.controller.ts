import { type Request, type Response, type NextFunction } from 'express';
import { loginUser, registerUser } from '../services/auth.service.ts'; // Use type for imports

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
            name: newUser.username,
        }
      }
    });
  } catch (error) {
    next(error);
  }
}