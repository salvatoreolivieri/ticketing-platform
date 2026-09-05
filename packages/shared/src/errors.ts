import type { ApiError } from "./envelope";

/** Base application error carrying the HTTP status and machine-readable code. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = new.target.name;
  }

  toApiError(): ApiError {
    return this.field
      ? { code: this.code, message: this.message, field: this.field }
      : { code: this.code, message: this.message };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(400, "VALIDATION_ERROR", message, field);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", field?: string) {
    super(404, "NOT_FOUND", message, field);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", field?: string) {
    super(409, "CONFLICT", message, field);
  }
}
