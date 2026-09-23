import CryptoJS from "crypto-js";

// ============ 常量配置 ============
const BASE_URL = "https://stock.cheesefortune.com";
const AES_KEY = "vGEZCiIXRIImAWSv"; // 从源码中提取的固定密钥
const TOKEN_API = "/api/v2/system/apiOuth";

// ============ 内存缓存（模拟 sessionStorage） ============
let cachedToken: string | null = null;

// ============ 工具函数 ============

/**
 * 将字符串按固定长度分块
 */
function splitToken(token: string, chunkSize = 8): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < token.length; i += chunkSize) {
    chunks.push(token.substring(i, i + chunkSize));
  }
  return chunks;
}

/**
 * AES-ECB 加密，PKCS7 填充，返回十六进制字符串
 */
function aesEcbEncrypt(plaintext: string, key: string): string {
  const keyWordArray = CryptoJS.enc.Latin1.parse(key);
  const encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString(); // 默认就是 hex 格式
}

/**
 * 计算 MD5（返回 32 位小写十六进制）
 */
function md5(data: string): string {
  return CryptoJS.MD5(data).toString();
}

/**
 * 获取 API 认证 token（带缓存）
 */
async function fetchApiToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const resp = await fetch(`${BASE_URL}${TOKEN_API}`, {
    headers: { "Content-Type": "application/json;charset=utf-8" },
  });

  const data = (await resp.json()) as any;

  const token = data?.datas;
  if (!token) {
    throw new Error("获取 API 认证 token 失败");
  }
  cachedToken = token;
  return token;
}

/**
 * 生成 zstokv1 签名
 * @param apiToken  从 /api/v2/system/apiOuth 获取的 token
 * @param timestamp 13 位毫秒时间戳
 */
function generateZstokv1(apiToken: string, timestamp: number): string {
  // 1. 分块
  const chunks = splitToken(apiToken, 8);

  // 2. 取时间戳个位数对应的块（与源码 e % 10 一致）
  const idx = timestamp % 10;
  const block = chunks[idx] ?? chunks[chunks.length - 1];

  // 3. AES 加密该块
  const encryptedBlock = aesEcbEncrypt(block, AES_KEY);

  // 4. 拼接时间戳和加密结果，计算 MD5
  return md5(String(timestamp) + encryptedBlock);
}

/**
 * 构造完整的请求头（对应源码中的 u1() 函数）
 * @param userToken 用户登录 token（localStorage 中的 cheese-outh-token），游客可传空字符串
 * @param deviceType 设备类型，如 "ios" / "android" / "pc"
 * @param runtimeType 运行环境，如 "unknown" / "wechat"
 * @param appVersion App 版本号，可传空字符串
 */
async function buildHeaders(
  timestamp: number,
  Referer = "",
): Promise<Record<string, string>> {
  const apiToken = await fetchApiToken();
  const zstokv1 = generateZstokv1(apiToken, timestamp);
  return {
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
    Referer,
  };
}

// ============ 主函数：发起请求 ============

/**
 * 请求芝士财富的 API
 */
export async function fetchCheeseApi(options: {
  url: string;
  Referer: string;
  timestamp: number;
}): Promise<any> {
  const headers = await buildHeaders(options.timestamp, options.Referer);
  const resp = await fetch(options.url, {
    method: "GET",
    body: null,
    headers,
  });

  // 处理响应（对应源码中的解密逻辑，如需可补充）
  let data = (await resp.json()) as any;

  return data?.datas ?? null;
}
