export type FetchErrorType =
  | "network"
  | "http"
  | "parse"
  | "api"
  | "schema";

export interface FetchError {
  errorType: FetchErrorType;
  message: string;
  retryable: boolean;
  status?: number;
}

export type FetchResult<T> =
  | { kind: "data"; data: T; raw: unknown }
  | { kind: "empty"; reason: string; raw: unknown }
  | { kind: "error"; error: FetchError };

export type TaskOutcome<T> =
  | FetchResult<T>
  | { kind: "skipped"; reason: string; raw?: unknown };

export function dataResult<T>(data: T, raw: unknown): FetchResult<T> {
  return { kind: "data", data, raw };
}

export function emptyResult<T>(
  reason: string,
  raw: unknown = null,
): FetchResult<T> {
  return { kind: "empty", reason, raw };
}

export function errorResult<T>(
  errorType: FetchErrorType,
  message: string,
  retryable: boolean,
  status?: number,
): FetchResult<T> {
  return {
    kind: "error",
    error: {
      errorType,
      message,
      retryable,
      status,
    },
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
