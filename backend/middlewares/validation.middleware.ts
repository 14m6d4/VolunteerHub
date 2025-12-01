// backend/middlewares/validation.middleware.ts

import { type Request, type Response, type NextFunction } from 'express';
import { validationResult, type ValidationChain, type ValidationError } from 'express-validator';
import AppError from '../utils/appError.ts'; // Import custom error class

/**
 * Wraps express-validator chains and handles validation errors centrally.
 * @param validations - Array of ValidationChain rules (e.g., loginSchema)
 * @returns An array containing the chains followed by the error handler middleware
 */
const validationMiddleware = (validations: ValidationChain[]) => {
  return [
    // 1. Run all validation chains defined in the schema
    ...validations,

    // 2. Error handler middleware after running validations
    (req: Request, res: Response, next: NextFunction) => {
      // Collect errors from express-validator
      const errors = validationResult(req);

      // If no errors, proceed to the controller
      if (errors.isEmpty()) {
        return next();
      }

      // If errors exist, format them
      // We extract only the first error message for simplicity in AppError
      const errorArray: ValidationError[] = errors.array();
      if (errorArray.length === 0) {
        return next(new AppError('Validation failed with unknown error.', 400));
      }
      const firstErrorMessage = errorArray[0]!.msg;

      // Throw AppError 400 (Bad Request)
      // This error will be caught by error.middleware.ts
      return next(new AppError(`Validation failed: ${firstErrorMessage}`, 400));
    },
  ];
};

export default validationMiddleware;

// import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import createHttpError from "http-errors";

export function validateEventBody(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const message = error.details.map((d) => d.message).join(", ");
      return next(createHttpError(400, message));
    }
    req.body = value;
    next();
  };
}