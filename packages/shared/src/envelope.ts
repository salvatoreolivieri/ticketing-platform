/**
 * Standard backend response envelope — identical shape for success and failure,
 * copied verbatim from the API design so every service and the gateway agree.
 */

/** A single error entry. */
export type ApiError = {
  code: string;
  message: string;
  field?: string;
};

/** Successful response: data is present, errors is always empty. */
export type ApiSuccess<T> = {
  success: true;
  status: number;
  data: T;
  errors: [];
  message: string;
};

/** Failed response: data is null, errors has at least one entry. */
export type ApiFailure = {
  success: false;
  status: number;
  data: null;
  errors: ApiError[];
  message: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Offset-based pagination metadata for list endpoints. */
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiPaginatedSuccess<T> = ApiSuccess<T[]> & {
  pagination: Pagination;
};

export type ApiPaginatedResponse<T> = ApiPaginatedSuccess<T> | ApiFailure;

export function ok<T>(data: T, message = "OK", status = 200): ApiSuccess<T> {
  return { success: true, status, data, errors: [], message };
}

export function created<T>(data: T, message = "Created"): ApiSuccess<T> {
  return { success: true, status: 201, data, errors: [], message };
}

export function paginated<T>(
  data: T[],
  pagination: Pagination,
  message = "OK",
): ApiPaginatedSuccess<T> {
  return { success: true, status: 200, data, errors: [], message, pagination };
}

export function fail(status: number, errors: ApiError[], message: string): ApiFailure {
  return { success: false, status, data: null, errors, message };
}
