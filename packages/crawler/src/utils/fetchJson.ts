import {
  dataResult,
  errorMessage,
  errorResult,
  type FetchResult,
} from "./fetchResult";

export interface JsonResponse {
  body: unknown;
  status: number;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export async function fetchJson(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<FetchResult<JsonResponse>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      return errorResult(
        "http",
        `HTTP ${response.status} ${response.statusText}`.trim(),
        isRetryableStatus(response.status),
        response.status,
      );
    }

    const text = await response.text();
    if (!text) {
      return errorResult("parse", "接口返回了空响应体", true, response.status);
    }

    try {
      return dataResult(
        {
          body: JSON.parse(text) as unknown,
          status: response.status,
        },
        text,
      );
    } catch (error) {
      return errorResult(
        "parse",
        `接口响应不是合法 JSON: ${errorMessage(error)}`,
        true,
        response.status,
      );
    }
  } catch (error) {
    return errorResult("network", errorMessage(error), true);
  } finally {
    clearTimeout(timeout);
  }
}
