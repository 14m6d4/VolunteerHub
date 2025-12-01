import { type Request, type Response, type NextFunction } from 'express';
import AppError from '../utils/appError.ts';

// Centralized error handler that always returns JSON responses for API errors
export default function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  // If headers already sent, delegate
  if (res.headersSent) {
    return next(err as any);
  }

  // Default values
  let statusCode = 500;
  let status = 'error';
  let message = 'Internal Server Error';

  if (err instanceof AppError) {
    statusCode = err.statusCode || 500;
    status = err.status || (String(statusCode).startsWith('4') ? 'fail' : 'error');
    message = err.message || message;
  } else if (err && typeof err === 'object' && 'statusCode' in err && 'message' in (err as any)) {
    // Handle http-errors or similar shapes
    const e: any = err;
    statusCode = e.statusCode || e.status || statusCode;
    status = e.status || status;
    message = e.message || message;
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  const payload: any = {
    status,
    message,
  };

  // In non-production include stack for debugging
  if (process.env.NODE_ENV !== 'production' && err instanceof Error) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}
