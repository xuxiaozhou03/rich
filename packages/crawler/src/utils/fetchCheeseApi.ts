import CryptoJS from "crypto-js";

import {
  dataResult,
  emptyResult,
  errorMessage,
  errorResult,
  isRecord,
  type FetchResult,
} from "./fetchResult";
import { fetchJson } from "./fetchJson";

const BASE_URL = "https://stock.cheesefortune.com";
const AES_KEY = "vGEZCiIXRIImAWSv";
const TOKEN_API = "/api/v2/system/apiOuth";

let cachedToken: string | null = null;

function splitToken(token: string, chunkSize = 8): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < token.length; i += chunkSize) {
    chunks.push(token.substring(i, i + chunkSize));
  }
  return chunks;
}

function aesEcbEncrypt(plaintext: string, key: string): string {
  const keyWordArray = CryptoJS.enc.Latin1.parse(key);
  const encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString();
}

function md5(data: string): string {
  return CryptoJS.MD5(data).toString();
}

function isApiSuccess(body: Record<string, unknown>): boolean {
  if (body.success === false) return false;
  if (body.code === undefined || body.code === null) return true;
  return (
    body.code === 0 ||
    body.code === 200 ||
    body.code === "0" ||
    body.code === "000" ||
    body.code === "200"
  );
}

function apiErrorMessage(body: Record<string, unknown>): string {
  const message = body.message;
  return typeof message === "string" && message
    ? message
    : `接口业务错误: ${String(body.code)}`;
}

async function fetchApiToken(): Promise<FetchResult<string>> {
  if (cachedToken) return dataResult(cachedToken, null);

  const response = await fetchJson(`${BASE_URL}${TOKEN_API}`, {
    headers: { "Content-Type": "application/json;charset=utf-8" },
  });
  if (response.kind !== "data") return response;

  if (!isRecord(response.data.body)) {
    return errorResult("schema", "token 接口响应结构不正确", false);
  }
  if (!isApiSuccess(response.data.body)) {
    return errorResult("api", apiErrorMessage(response.data.body), false);
  }

  const token = response.data.body.datas;
  if (typeof token !== "string" || !token) {
    return errorResult("schema", "token 接口没有返回有效 datas", false);
  }

  cachedToken = token;
  return dataResult(token, response.data.body);
}

function generateZstokv1(apiToken: string, timestamp: number): string {
  const chunks = splitToken(apiToken, 8);
  const index = timestamp % 10;
  const block = chunks[index] ?? chunks[chunks.length - 1];
  const encryptedBlock = aesEcbEncrypt(block, AES_KEY);
  return md5(String(timestamp) + encryptedBlock);
}

async function buildHeaders(
  timestamp: number,
  referer: string,
): Promise<FetchResult<Record<string, string>>> {
  const tokenResult = await fetchApiToken();
  if (tokenResult.kind !== "data") return tokenResult;

  const zstokv1 = generateZstokv1(tokenResult.data, timestamp);
  return dataResult(
    {
      accept: "*/*",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
      "app-version": "",
      "cache-control": "no-cache",
      "content-type": "application/json;charset=utf-8",
      devicetype: "ios",
      expires: "-1",
      pragma: "no-cache",
      requestfrom: "wechat",
      runtimetype: "unknown",
      "sec-ch-ua":
        '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"iOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      timestamp: String(timestamp),
      token: "",
      zstokv1,
      Referer: referer,
    },
    null,
  );
}

/**
 * 请求芝士财富 API，并保留“业务失败”和“成功但无数据”的区别。
 */
export async function fetchCheeseApi<T>(options: {
  url: string;
  Referer: string;
  timestamp: number;
}): Promise<FetchResult<T>> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const headersResult = await buildHeaders(
      options.timestamp,
      options.Referer,
    );
    if (headersResult.kind !== "data") return headersResult;

    let response: Awaited<ReturnType<typeof fetchJson>>;
    try {
      response = await fetchJson(options.url, {
        method: "GET",
        headers: headersResult.data,
      });
    } catch (error) {
      return errorResult("network", errorMessage(error), true);
    }

    if (response.kind !== "data") return response;

    if (response.data.status === 401 && attempt === 0) {
      cachedToken = null;
      continue;
    }

    if (!isRecord(response.data.body)) {
      return errorResult(
        "schema",
        "接口响应不是对象结构",
        false,
        response.data.status,
      );
    }

    const body = response.data.body;
    if (!isApiSuccess(body)) {
      const retryable = body.code === "401";
      if (retryable && attempt === 0) {
        cachedToken = null;
        continue;
      }
      return errorResult(
        "api",
        apiErrorMessage(body),
        retryable,
        response.data.status,
      );
    }

    if (body.datas === null || body.datas === undefined) {
      return emptyResult("datas 为空", body);
    }

    return dataResult(body.datas as T, body);
  }

  return errorResult("api", "接口认证失败", true);
}
