export const runtime = "edge";

import { stringify, parse } from "yaml";

/* ─────────── 类型定义 ─────────── */

interface ProxyNode {
  name: string;
  type: string;
  server: string;
  port: number;
  password?: string;
  uuid?: string;
  cipher?: string;
  alterId?: number;
  network?: string;
  tls?: boolean;
  "skip-cert-verify"?: boolean;
  servername?: string;
  sni?: string;
  "ws-opts"?: Record<string, unknown>;
  "grpc-opts"?: Record<string, unknown>;
  "h2-opts"?: Record<string, unknown>;
  flow?: string;
  udp?: boolean;
}

/* ─────────── 纯 JS Base64 编解码（UTF-8 安全） ─────────── */

function safeBase64Decode(str: string): string | null {
  try {
    const clean = str.trim().replace(/[\s\r\n]+/g, "");
    if (!/^[A-Za-z0-9+/=_-]+$/.test(clean) || clean.length < 4) return null;
    const normalized = clean.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function safeBase64Encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/* ─────────── 订阅内容解码（支持多层 base64） ─────────── */

function decodeSubscription(text: string): string {
  let current = text.trim();
  // 最多尝试解码 3 层 base64
  for (let i = 0; i < 3; i++) {
    const decoded = safeBase64Decode(current);
    if (!decoded) break;
    current = decoded;
  }
  return current;
}

/* ─────────── 内容诊断 ─────────── */

function diagnoseContent(text: string): { protocols: string[]; preview: string; lineCount: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const protocols: string[] = [];
  if (lines.some((l) => l.startsWith("vmess://"))) protocols.push("vmess");
  if (lines.some((l) => l.startsWith("vless://"))) protocols.push("vless");
  if (lines.some((l) => l.startsWith("trojan://"))) protocols.push("trojan");
  if (lines.some((l) => l.startsWith("ss://"))) protocols.push("ss");
  if (lines.some((l) => l.startsWith("ssr://"))) protocols.push("ssr");
  if (lines.some((l) => l.startsWith("hysteria://"))) protocols.push("hysteria");
  if (lines.some((l) => l.startsWith("tuic://"))) protocols.push("tuic");
  if (text.includes("proxies:")) protocols.push("clash-yaml");

  const preview = text.slice(0, 300).replace(/\s+/g, " ");
  return { protocols, preview, lineCount: lines.length };
}

/* ─────────── QueryString 解析 ─────────── */

function parseQueryString(query: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!query) return params;
  for (const pair of query.split("&")) {
    const [key, value] = pair.split("=");
    if (key) {
      try {
        params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : "";
      } catch {
        params[key] = value || "";
      }
    }
  }
  return params;
}

/* ─────────── URI 协议解析 ─────────── */

function parseTrojan(uri: string): ProxyNode | null {
  try {
    const url = new URL(uri);
    const password = decodeURIComponent(url.username);
    const server = url.hostname;
    const port = parseInt(url.port, 10) || 443;
    const name = decodeURIComponent(url.hash.replace("#", "")) || server;
    const query = parseQueryString(url.search.slice(1));

    const node: ProxyNode = {
      name,
      type: "trojan",
      server,
      port,
      password,
      udp: true,
    };

    if (query.sni) node.sni = query.sni;
    if (query.allowInsecure === "1") node["skip-cert-verify"] = true;
    if (query.type && query.type !== "tcp") {
      node.network = query.type;
      if (query.type === "ws") {
        node["ws-opts"] = {};
        if (query.path) node["ws-opts"].path = decodeURIComponent(query.path);
        if (query.host) node["ws-opts"].headers = { Host: query.host };
      } else if (query.type === "grpc") {
        node["grpc-opts"] = {};
        if (query.serviceName) {
          node["grpc-opts"]["grpc-service-name"] = decodeURIComponent(query.serviceName);
        }
      }
    }
    return node;
  } catch {
    return null;
  }
}

function parseVless(uri: string): ProxyNode | null {
  try {
    const url = new URL(uri);
    const uuid = decodeURIComponent(url.username);
    const server = url.hostname;
    const port = parseInt(url.port, 10) || 443;
    const name = decodeURIComponent(url.hash.replace("#", "")) || server;
    const query = parseQueryString(url.search.slice(1));

    const node: ProxyNode = {
      name,
      type: "vless",
      server,
      port,
      uuid,
      udp: true,
    };

    if (query.flow) node.flow = query.flow;
    if (query.security === "tls" || query.security === "xtls" || query.security === "reality") {
      node.tls = true;
    }
    if (query.sni) node.servername = query.sni;
    if (query.allowInsecure === "1") node["skip-cert-verify"] = true;

    const net = query.type || "tcp";
    if (net !== "tcp") node.network = net;

    if (net === "ws") {
      node["ws-opts"] = {};
      if (query.path) node["ws-opts"].path = decodeURIComponent(query.path);
      if (query.host) node["ws-opts"].headers = { Host: query.host };
    } else if (net === "grpc") {
      node["grpc-opts"] = {};
      if (query.serviceName) {
        node["grpc-opts"]["grpc-service-name"] = decodeURIComponent(query.serviceName);
      }
    }
    return node;
  } catch {
    return null;
  }
}

function parseVmess(uri: string): ProxyNode | null {
  try {
    const b64 = uri.slice("vmess://".length);
    const jsonStr = safeBase64Decode(b64);
    if (!jsonStr) return null;
    const data = JSON.parse(jsonStr);

    const node: ProxyNode = {
      name: data.ps || data.remark || "vmess",
      type: "vmess",
      server: data.add || data.address,
      port: parseInt(data.port, 10),
      uuid: data.id,
      alterId: parseInt(data.aid || data.alterId || "0", 10),
      cipher: data.scy || data.security || "auto",
      udp: true,
    };

    const net = data.net || data.network || "tcp";
    if (net !== "tcp") node.network = net;

    if (data.tls === "tls" || data.tls === true) {
      node.tls = true;
      if (data.sni) node.servername = data.sni;
    }

    if (net === "ws") {
      node["ws-opts"] = {};
      if (data.path) node["ws-opts"].path = data.path;
      if (data.host) node["ws-opts"].headers = { Host: data.host };
    } else if (net === "grpc") {
      node["grpc-opts"] = {};
      if (data.path) node["grpc-opts"]["grpc-service-name"] = data.path;
    } else if (net === "h2") {
      node["h2-opts"] = {};
      if (data.host) node["h2-opts"].host = [data.host];
      if (data.path) node["h2-opts"].path = data.path;
    }
    return node;
  } catch {
    return null;
  }
}

function parseSs(uri: string): ProxyNode | null {
  try {
    const rest = uri.slice("ss://".length);

    // 分离 #name
    let name = "";
    let body = rest;
    const hashIdx = rest.lastIndexOf("#");
    if (hashIdx >= 0) {
      body = rest.slice(0, hashIdx);
      try {
        name = decodeURIComponent(rest.slice(hashIdx + 1));
      } catch {
        name = rest.slice(hashIdx + 1);
      }
    }

    // 尝试整体 base64 解码（格式 C / D）
    const decoded = safeBase64Decode(body);
    if (decoded && decoded.includes("@")) {
      return parseSs(`ss://${decoded}${hashIdx >= 0 ? rest.slice(hashIdx) : ""}`);
    }

    const atIdx = body.lastIndexOf("@");
    if (atIdx < 0) return null;

    const left = body.slice(0, atIdx);
    const right = body.slice(atIdx + 1);

    // 解析 server:port
    const colonIdx = right.lastIndexOf(":");
    if (colonIdx < 0) return null;
    const server = right.slice(0, colonIdx);
    const port = parseInt(right.slice(colonIdx + 1), 10);

    // 解析 method:password（left 可能是 base64）
    let methodPass = left;
    const decodedLeft = safeBase64Decode(left);
    if (decodedLeft) methodPass = decodedLeft;

    const mpColon = methodPass.indexOf(":");
    if (mpColon < 0) return null;
    const method = methodPass.slice(0, mpColon);
    const password = methodPass.slice(mpColon + 1);

    return {
      name: name || server,
      type: "ss",
      server,
      port,
      cipher: method,
      password,
      udp: true,
    };
  } catch {
    return null;
  }
}

/* ─────────── SSR 协议解析（转为 Clash ss） ─────────── */

function parseSsr(uri: string): ProxyNode | null {
  try {
    const b64 = uri.slice("ssr://".length);
    const decoded = safeBase64Decode(b64);
    if (!decoded) return null;

    // 格式: server:port:protocol:method:obfs:password_base64/?params
    const [mainPart, queryPart] = decoded.split("/?");
    if (!mainPart) return null;

    const parts = mainPart.split(":");
    if (parts.length < 6) return null;

    const server = parts[0];
    const port = parseInt(parts[1], 10);
    const method = parts[3];
    const passwordB64 = parts[5];
    const password = safeBase64Decode(passwordB64) || passwordB64;

    let name = server;
    if (queryPart) {
      const qs = parseQueryString(queryPart);
      if (qs.remarks) {
        try {
          name = safeBase64Decode(qs.remarks) || qs.remarks;
        } catch {
          name = qs.remarks;
        }
      }
    }

    return {
      name,
      type: "ss",
      server,
      port,
      cipher: method,
      password,
      udp: true,
    };
  } catch {
    return null;
  }
}

function parseUri(uri: string): ProxyNode | null {
  const trimmed = uri.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("trojan://")) return parseTrojan(trimmed);
  if (trimmed.startsWith("vless://")) return parseVless(trimmed);
  if (trimmed.startsWith("vmess://")) return parseVmess(trimmed);
  if (trimmed.startsWith("ss://")) return parseSs(trimmed);
  if (trimmed.startsWith("ssr://")) return parseSsr(trimmed);
  return null;
}

/* ─────────── YAML 解析（原始订阅为 Clash 配置时） ─────────── */

function parseYamlProxies(text: string): ProxyNode[] {
  try {
    const doc = parse(text) as Record<string, unknown>;
    const proxies = doc.proxies as ProxyNode[] | undefined;
    if (!Array.isArray(proxies)) return [];
    return proxies.filter((p) => p && typeof p.name === "string" && typeof p.server === "string");
  } catch {
    return [];
  }
}

/* ─────────── 输出格式组装 ─────────── */

function deduplicateNames(proxies: ProxyNode[]): ProxyNode[] {
  const names = new Set<string>();
  return proxies.map((p) => {
    let name = p.name;
    let count = 1;
    while (names.has(name)) {
      name = `${p.name}_${count++}`;
    }
    names.add(name);
    return { ...p, name };
  });
}

function toClashConfig(proxies: ProxyNode[]): string {
  const proxyNames = proxies.map((p) => p.name);

  // 组名统一用常量，避免定义处和 rules 引用处各写一份字面量而对不上
  const GROUP_SELECT = "\uD83D\uDE80 \u8282\u70B9\u9009\u62E9";      // 🚀 节点选择
  const GROUP_AUTO = "\u2668\uFE0F \u81EA\u52A8\u9009\u62E9";        // ♨️ 自动选择
  const GROUP_DIRECT = "\uD83C\uDF0F \u76F4\u8FDE\u901A\u9053";      // 🌏 直连通道
  const GROUP_BLOCK = "\uD83D\uDED1 \u62E6\u622A\u5E7F\u544A";       // 🛑 拦截广告
  const GROUP_FINAL = GROUP_DIRECT;                                 // 兜底规则走的组

  const config = {
    "mixed-port": 7890,
    "allow-lan": false,
    mode: "Rule",
    "log-level": "info",
    "external-controller": "127.0.0.1:9090",
    proxies,
    "proxy-groups": [
      {
        name: GROUP_SELECT,
        type: "select",
        proxies: [GROUP_AUTO, GROUP_DIRECT, ...proxyNames],
      },
      {
        name: GROUP_AUTO,
        type: "url-test",
        url: "http://www.gstatic.com/generate_204",
        interval: 300,
        tolerance: 50,
        proxies: proxyNames,
      },
      {
        name: GROUP_DIRECT,
        type: "select",
        proxies: ["DIRECT", GROUP_SELECT],
      },
      {
        name: GROUP_BLOCK,
        type: "select",
        proxies: ["REJECT", "DIRECT"],
      },
    ],
    rules: [
      `DOMAIN-SUFFIX,local,${GROUP_FINAL}`,
      `IP-CIDR,127.0.0.0/8,${GROUP_FINAL}`,
      `IP-CIDR,172.16.0.0/12,${GROUP_FINAL}`,
      `IP-CIDR,192.168.0.0/16,${GROUP_FINAL}`,
      `IP-CIDR,10.0.0.0/8,${GROUP_FINAL}`,
      `IP-CIDR,100.64.0.0/10,${GROUP_FINAL}`,
      `GEOIP,private,${GROUP_FINAL},no-resolve`,
      `GEOIP,CN,${GROUP_FINAL},no-resolve`,
      `MATCH,${GROUP_SELECT}`,
    ],
  };

  return stringify(config);
}

function toShadowrocket(proxies: ProxyNode[]): string {
  const uris: string[] = [];

  for (const p of proxies) {
    try {
      if (p.type === "trojan") {
        const qs = new URLSearchParams();
        if (p.sni) qs.set("sni", p.sni);
        if (p["skip-cert-verify"]) qs.set("allowInsecure", "1");
        if (p.network && p.network !== "tcp") qs.set("type", p.network);
        if (p.network === "ws" && p["ws-opts"]) {
          const ws = p["ws-opts"] as Record<string, unknown>;
          if (ws.path) qs.set("path", String(ws.path));
          if (ws.headers && (ws.headers as Record<string, string>).Host) {
            qs.set("host", (ws.headers as Record<string, string>).Host);
          }
        }
        if (p.network === "grpc" && p["grpc-opts"]) {
          const svc = (p["grpc-opts"] as Record<string, unknown>)["grpc-service-name"];
          if (svc) qs.set("serviceName", String(svc));
        }
        const query = qs.toString();
        uris.push(
          `trojan://${p.password}@${p.server}:${p.port}${query ? "?" + query : ""}#${encodeURIComponent(p.name)}`
        );
      } else if (p.type === "vless") {
        const qs = new URLSearchParams();
        if (p.tls) qs.set("security", "tls");
        if (p.servername) qs.set("sni", p.servername);
        if (p.flow) qs.set("flow", p.flow);
        if (p.network && p.network !== "tcp") qs.set("type", p.network);
        if (p["skip-cert-verify"]) qs.set("allowInsecure", "1");
        if (p.network === "ws" && p["ws-opts"]) {
          const ws = p["ws-opts"] as Record<string, unknown>;
          if (ws.path) qs.set("path", String(ws.path));
          if (ws.headers && (ws.headers as Record<string, string>).Host) {
            qs.set("host", (ws.headers as Record<string, string>).Host);
          }
        }
        if (p.network === "grpc" && p["grpc-opts"]) {
          const svc = (p["grpc-opts"] as Record<string, unknown>)["grpc-service-name"];
          if (svc) qs.set("serviceName", String(svc));
        }
        const query = qs.toString();
        uris.push(
          `vless://${p.uuid}@${p.server}:${p.port}${query ? "?" + query : ""}#${encodeURIComponent(p.name)}`
        );
      } else if (p.type === "vmess") {
        const obj = {
          v: "2",
          ps: p.name,
          add: p.server,
          port: String(p.port),
          id: p.uuid,
          aid: String(p.alterId || 0),
          scy: p.cipher || "auto",
          net: p.network || "tcp",
          type: "none",
          host: (p["ws-opts"]?.headers as Record<string, string>)?.Host || "",
          path: String(p["ws-opts"]?.path || ""),
          tls: p.tls ? "tls" : "",
          sni: p.servername || "",
        };
        uris.push(`vmess://${safeBase64Encode(JSON.stringify(obj))}`);
      } else if (p.type === "ss") {
        const userInfo = safeBase64Encode(`${p.cipher}:${p.password}`);
        uris.push(`ss://${userInfo}@${p.server}:${p.port}#${encodeURIComponent(p.name)}`);
      }
    } catch {
      // 跳过构建失败的节点
    }
  }

  return safeBase64Encode(uris.join("\n"));
}

/* ─────────── 核心转换逻辑（GET 与 POST 共用） ─────────── */

function looksLikeUrl(text: string): boolean {
  const trimmed = text.trim();
  return /^https?:\/\//.test(trimmed) && trimmed.split("\n").length === 1;
}

async function resolveSubscriptionContent(
  text: string,
  depth = 0,
  maxDepth = 2
): Promise<string> {
  const decoded = decodeSubscription(text);

  // 如果解码后是一个 URL，且未达到递归深度，尝试 fetch
  if (depth < maxDepth && looksLikeUrl(decoded)) {
    const url = decoded.trim();
    try {
      const resp = await fetchWithTimeout(
        url,
        {
          headers: {
            "User-Agent": "Shadowrocket/1982 CFNetwork/1335.0.3 Darwin/21.6.0",
            Accept: "*/*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            Referer: url,
          },
        },
        10000
      );
      if (resp.ok) {
        const innerText = await resp.text();
        return resolveSubscriptionContent(innerText, depth + 1, maxDepth);
      }
    } catch {
      // 嵌套 URL fetch 失败，返回已解码的内容（让外层诊断）
    }
  }

  return decoded;
}

async function convert(
  originalText: string,
  target: string
): Promise<{ output: string; contentType: string; nodesCount: number; protocols: string[] }> {
  // 解码订阅内容，支持嵌套 URL 自动解析
  const decoded = await resolveSubscriptionContent(originalText);

  // 解析节点（优先尝试 YAML，回退到逐行 URI）
  let proxies: ProxyNode[] = [];

  if (decoded.includes("proxies:") || decoded.trim().startsWith("port:")) {
    proxies = parseYamlProxies(decoded);
  }

  if (proxies.length === 0) {
    const lines = decoded.split(/\r?\n/).filter((l) => l.trim());
    for (const line of lines) {
      const node = parseUri(line);
      if (node) proxies.push(node);
    }
  }

  // 去重名称
  proxies = deduplicateNames(proxies);

  if (proxies.length === 0) {
    const diag = diagnoseContent(decoded);
    const diagMsg = `未找到有效节点。检测到协议: [${diag.protocols.join(", ") || "无"}], 共 ${diag.lineCount} 行, 内容预览: ${diag.preview}`;
    throw new Error(diagMsg);
  }

  // 统计协议类型
  const protocols = Array.from(new Set(proxies.map((p) => p.type)));

  // 生成输出
  if (target === "shadowrocket" || target === "v2rayn") {
    return { output: toShadowrocket(proxies), contentType: "text/plain; charset=utf-8", nodesCount: proxies.length, protocols };
  }
  return { output: toClashConfig(proxies), contentType: "text/yaml; charset=utf-8", nodesCount: proxies.length, protocols };
}

/* ─────────── 带超时的 fetch ─────────── */

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(id);
  }
}

function classifyFetchError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("abort") || lower.includes("timeout")) {
    return { status: 504, message: "连接超时：订阅服务器响应过慢或网络不可达" };
  }
  if (lower.includes("certificate") || lower.includes("ssl") || lower.includes("tls")) {
    return { status: 502, message: "TLS 证书错误：订阅服务器证书不被信任" };
  }
  if (lower.includes("dns") || lower.includes("getaddrinfo") || lower.includes("ENOTFOUND")) {
    return { status: 502, message: "DNS 解析失败：无法解析订阅域名" };
  }
  if (lower.includes("refused") || lower.includes("econnrefused")) {
    return { status: 502, message: "连接被拒绝：订阅服务器未响应或端口关闭" };
  }
  if (lower.includes("blocked") || lower.includes("forbidden") || lower.includes("403")) {
    return { status: 502, message: "请求被拦截：订阅服务器拒绝此来源的请求" };
  }
  return { status: 502, message: `网络请求失败：${msg}` };
}

/* ─────────── GET handler ─────────── */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const target = searchParams.get("target") || "clash";

  if (!url) {
    return new Response(JSON.stringify({ error: "Missing required parameter: url" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  let originalText: string;
  try {
    const decodedUrl = decodeURIComponent(url);
    const resp = await fetchWithTimeout(
      decodedUrl,
      {
        headers: {
          "User-Agent": "Shadowrocket/1982 CFNetwork/1335.0.3 Darwin/21.6.0",
          Accept: "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Referer: decodedUrl,
        },
      },
      10000
    );

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: `订阅服务器返回 HTTP ${resp.status}，请检查链接是否有效` }),
        { status: 502, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    originalText = await resp.text();
  } catch (e) {
    const { status, message } = classifyFetchError(e);
    return new Response(
      JSON.stringify({ error: message, hint: "如果订阅 URL 无法直接访问，建议使用「粘贴文本」或「上传文件」方式" }),
      { status, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  try {
    const { output, contentType, nodesCount, protocols } = await convert(originalText, target);
    return new Response(output, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        "X-Nodes-Count": String(nodesCount),
        "X-Protocols": protocols.join(","),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 422, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

/* ─────────── POST handler ─────────── */

export async function POST(request: Request) {
  let body: { content?: string; target?: string };
  try {
    body = (await request.json()) as { content?: string; target?: string };
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  const content = body.content;
  const target = body.target || "clash";

  if (!content || typeof content !== "string") {
    return new Response(
      JSON.stringify({ error: "Missing required field: content" }),
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  try {
    const { output, contentType, nodesCount, protocols } = await convert(content, target);
    return new Response(output, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        "X-Nodes-Count": String(nodesCount),
        "X-Protocols": protocols.join(","),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 422, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}
