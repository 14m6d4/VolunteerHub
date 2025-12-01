// backend/utils/appError.ts

/**
 * Custom error class for application logic errors.
 * Used to standardize error responses across the API.
 */
class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  /**
   * @param message - Error description
   * @param statusCode - HTTP status code (e.g., 404, 401)
   */
  constructor(message: string, statusCode: number) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Mark as expected/handled error

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;