import { ValidationError } from "./errors";

export function requireInt(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ValidationError(`${name} must be an integer`, name);
  }
  return value;
}

export function requirePositiveInt(value: unknown, name: string): number {
  const n = requireInt(value, name);
  if (n < 1) throw new ValidationError(`${name} must be >= 1`, name);
  return n;
}

export function requireNonNegativeInt(value: unknown, name: string): number {
  const n = requireInt(value, name);
  if (n < 0) throw new ValidationError(`${name} must be >= 0`, name);
  return n;
}

export function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${name} is required`, name);
  }
  return value;
}

export type DateRange = { start: Date; end: Date };

/** Parses `YYYY-MM-DD..YYYY-MM-DD` (inclusive). Throws ValidationError otherwise. */
export function parseDateRange(raw: unknown, name = "date_range"): DateRange {
  if (typeof raw !== "string") throw new ValidationError(`${name} must be a string`, name);
  const parts = raw.split("..");
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  if (parts.length !== 2 || !isoDate.test(parts[0]!) || !isoDate.test(parts[1]!)) {
    throw new ValidationError(`${name} must be "YYYY-MM-DD..YYYY-MM-DD"`, name);
  }
  const start = new Date(`${parts[0]}T00:00:00.000Z`);
  const end = new Date(`${parts[1]}T23:59:59.999Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ValidationError(`${name} has invalid dates`, name);
  }
  if (start > end) throw new ValidationError(`${name} start must be <= end`, name);
  return { start, end };
}
