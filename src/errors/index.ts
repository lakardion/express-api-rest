type ErrorStatusCodes = 400 | 422 | 500 | 404 | 401 | 403;

export type ApiErrors =
  | RequestValidationError
  | InternalServerError
  | NotFound
  | Unauthorized;

interface ApiError {
  statusCode: ErrorStatusCodes;
  data?: any;
}
export class RequestValidationError extends Error implements ApiError {
  statusCode: ErrorStatusCodes;
  data: any;
  constructor(message: string, validationErrors: any[]) {
    super(message);
    this.data = validationErrors;
    this.statusCode = 422;
  }
}

export class InternalServerError extends Error implements ApiError {
  statusCode: ErrorStatusCodes;
  data: any;
  constructor(message: string) {
    super(message);
    this.statusCode = 500;
  }
}

export class NotFound extends Error implements ApiError {
  statusCode: ErrorStatusCodes;
  data: any;
  constructor(message: string) {
    super(message);
    this.statusCode = 404;
  }
}

export class Unauthorized extends Error implements ApiError {
  statusCode: ErrorStatusCodes;
  data: any;
  constructor(message: string) {
    super(message);
    this.statusCode = 401;
  }
}

export class Forbidden extends Error implements ApiError {
  statusCode: ErrorStatusCodes;
  data: any;
  constructor(message: string) {
    super(message);
    this.statusCode = 403;
  }
}
