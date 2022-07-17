import { NextFunction } from 'express';
import { ValidationError } from 'express-validator';
import { RequestValidationError } from '../../errors/index.js';

export const createValidationError = (
  next: NextFunction,
  errorsArray: ValidationError[]
) => {
  const error = new RequestValidationError(
    'Validation failed, entered data is incorrect.',
    errorsArray
  );
  return next(error);
};
