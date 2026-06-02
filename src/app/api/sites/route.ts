import { createClient } from "@vercel/edge-config";
import { NextResponse } from "next/server";
import { sites as defaultSites } from "@/data/sites";
import type { Site } from "@/types";

const EDGE_CONFIG_KEY = "sites";
const VERCEL_API = "https://api.vercel.com";
const POST_COOLDOWN_MS = 60_000;

const addTimestamps = new Map<string, number>();

// ========== 工具函数 ==========

/**
 * 获取 Edge Config ID
 * 优先读 EDGE_CONFIG_ID，否则从 EDGE_CONFIG 连接串中提取
 */
function getEdgeConfigId(): string | undefined {
  if (process.env.EDGE_CONFIG_ID) return process.env.EDGE_CONFIG_ID;

  // EDGE_CONFIG 格式: https://edge-config.vercel.com/<id>?token=xxx
  // 之前用 split("/").pop() 会把 query string 也带进来，导致 API URL 畸形
  if (process.env.EDGE_CONFIG) {
    try {
      return new URL(process.env.EDGE_CONFIG).pathname.split("/").pop();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// ========== 读写 Edge Config ==========

/** 从 REST API 响应中提取站点列表（兼容多种返回格式） */
function extractSitesFromApi(data: unknown): Site[] | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  // 格式1: { items: [{ key: "...", value: [...] }] }
  if (Array.isArray(obj.items)) {
    const item = obj.items.find(
      (i: unknown) => i && typeof i === "object" && (i as Record<string, unknown>).key === EDGE_CONFIG_KEY
    ) as { value?: Site[] } | undefined;
    if (item && Array.isArray(item.value)) return item.value;
  }

  // 格式2: 直接就是数组
  if (Array.isArray(data)) return data as Site[];

  // 格式3: 单个 item { key: "...", value: [...] }
  if (obj.key === EDGE_CONFIG_KEY && Array.isArray(obj.value)) return obj.value as Site[];

  return null;
}

/**
 * 从 Edge Config 读取站点列表
 * 优先走 REST API（无边缘缓存，实时数据），SDK 作为回退
 */
async function readSites(): Promise<Site[]> {
  const token = process.env.VERCEL_TOKEN;
  const edgeConfigId = getEdgeConfigId();

  // 1. 优先 REST API 直读 — 跟写路径同一通道，无 CDN 缓存
  if (token && edgeConfigId) {
    try {
      const res = await fetch(
        `${VERCEL_API}/v1/edge-config/${edgeConfigId}/items`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const stored = extractSitesFromApi(await res.json());
        if (stored && stored.length > 0) return stored;
        await seedDefaultSites();
        return defaultSites;
      }
    } catch {
      // 回退到 SDK
    }
  }

  // 2. 回退：SDK 读取（有边缘缓存，本地开发 / VERCEL_TOKEN 缺失时走这里）
  const connectionString = process.env.EDGE_CONFIG;
  if (!connectionString) return defaultSites;

  try {
    const edgeConfig = createClient(connectionString);
    const stored = await edgeConfig.get<Site[]>(EDGE_CONFIG_KEY);

    if (!stored || stored.length === 0) {
      await seedDefaultSites();
      return defaultSites;
    }

    return stored;
  } catch (err) {
    console.error("Edge Config 读取失败:", err);
    return defaultSites;
  }
}

/** 首次写入默认数据到 Edge Config */
async function seedDefaultSites() {
  const result = await writeSites(defaultSites);
  if (!result.ok) {
    console.warn("seedDefaultSites 写入失败:", result.reason, "detail" in result ? result.detail : "");
  }
}

type WriteResult =
  | { ok: true }
  | { ok: false; reason: "missing_config"; missing: string[] }
  | { ok: false; reason: "api_error"; detail: string };

/**
 * 通过 Vercel API 写入站点列表到 Edge Config
 * 返回 WriteResult 区分"环境变量缺失"和"API 调用失败"
 */
async function writeSites(sites: Site[]): Promise<WriteResult> {
  const token = process.env.VERCEL_TOKEN;
  const edgeConfigId = getEdgeConfigId();

  if (!token || !edgeConfigId) {
    const missing: string[] = [];
    if (!token) missing.push("VERCEL_TOKEN");
    if (!edgeConfigId) missing.push("EDGE_CONFIG_ID（或 EDGE_CONFIG）");
    return { ok: false, reason: "missing_config", missing };
  }

  try {
    const res = await fetch(
      `${VERCEL_API}/v1/edge-config/${edgeConfigId}/items`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            { operation: "upsert", key: EDGE_CONFIG_KEY, value: sites },
          ],
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "(无法读取响应体)");
      console.error(`Vercel API 写入失败 (${res.status}):`, body);
      return { ok: false, reason: "api_error", detail: `${res.status}: ${body}` };
    }

    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Vercel API 请求异常:", detail);
    return { ok: false, reason: "api_error", detail };
  }
}

// ========== API Handlers ==========

export async function GET() {
  const sites = await readSites();
  return NextResponse.json(sites);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const lastAdd = addTimestamps.get(ip);
  const now = Date.now();

  if (lastAdd && now - lastAdd < POST_COOLDOWN_MS) {
    const remaining = Math.ceil((POST_COOLDOWN_MS - (now - lastAdd)) / 1000);
    return NextResponse.json(
      { error: `操作太频繁，请 ${remaining} 秒后再试` },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { name, url, description, icon, tags } = body;

  if (!name || !url) {
    return NextResponse.json({ error: "名称和网址是必填的" }, { status: 400 });
  }

  const normalizedUrl = url.toLowerCase().replace(/\/+$/, "");
  const id = normalizedUrl
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const stored = await readSites();

  if (stored.some((s) => s.url.toLowerCase().replace(/\/+$/, "") === normalizedUrl)) {
    return NextResponse.json({ error: "该网站已存在" }, { status: 409 });
  }

  const newSite: Site = {
    id: `custom-${id}`,
    name,
    url,
    description: description || "",
    icon: icon || "🌐",
    tags: tags || [],
  };

  const result = await writeSites([...stored, newSite]);

  if (!result.ok) {
    if (result.reason === "missing_config") {
      return NextResponse.json(
        { error: `存储服务未配置，缺少环境变量：${result.missing.join("、")}。请在 Vercel 后台 → Settings → Environment Variables 中设置` },
        { status: 500 }
      );
    }
    // api_error — 打印到服务端日志，返给前端脱敏信息
    console.error("writeSites api_error:", result.detail);
    return NextResponse.json(
      { error: "数据存储失败，请稍后重试" },
      { status: 500 }
    );
  }

  addTimestamps.set(ip, now);
  return NextResponse.json(newSite, { status: 201 });
}

export async function DELETE(request: Request) {
  const url = request.url.includes("://") ? new URL(request.url) : new URL(request.url, "http://localhost");
  const { searchParams } = url;
  const id = searchParams.get("id");
  const deleteKey = request.headers.get("x-delete-key");

  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }

  const expectedKey = process.env.DELETE_SECRET;
  if (!expectedKey || deleteKey !== expectedKey) {
    return NextResponse.json({ error: "删除密钥错误" }, { status: 403 });
  }

  const stored = await readSites();
  const filtered = stored.filter((s) => s.id !== id);

  if (filtered.length === stored.length) {
    return NextResponse.json({ error: "未找到该网站" }, { status: 404 });
  }

  const result = await writeSites(filtered);

  if (!result.ok) {
    if (result.reason === "missing_config") {
      return NextResponse.json(
        { error: `存储服务未配置，缺少环境变量：${result.missing.join("、")}。请在 Vercel 后台 → Settings → Environment Variables 中设置` },
        { status: 500 }
      );
    }
    console.error("writeSites api_error:", result.detail);
    return NextResponse.json(
      { error: "数据存储失败，请稍后重试" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
