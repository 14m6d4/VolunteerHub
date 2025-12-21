import { type Request, type Response, type NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import AppError from '../utils/appError.ts';

export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        console.error("Validation error:", errorMessages);
        return next(new AppError(`Validation failed: ${errorMessages}`, 400));
      }
      return next(new AppError('Validation failed with unknown error.', 400));
    }
  };
};


export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        return next(new AppError(`Validation failed: ${errorMessages}`, 400));
      }
      return next(new AppError('Validation failed with unknown error.', 400));
    }
  };
};


export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        return next(new AppError(`Validation failed: ${errorMessages}`, 400));
      }
      return next(new AppError('Validation failed with unknown error.', 400));
    }
  };
};

export default validateBody;