import { createClient } from "@vercel/edge-config";
import { NextResponse } from "next/server";
import { sites as defaultSites } from "@/data/sites";
import type { Site } from "@/types";

/**
 * Edge Config 存储键 — 只存用户新增的站点，固定站点永远在 src/data/sites.ts
 * 这样增删改查都不涉及固定站点，彻底消除 auto-merge / seed / 脏数据等补丁
 */
const USER_SITES_KEY = "user_sites";
const VERCEL_API = "https://api.vercel.com";
const POST_COOLDOWN_MS = 60_000;

/** 固定站点 ID 集合 — 这些不允许删除 */
const defaultIds = new Set(defaultSites.map((s) => s.id));

/** 固定站点 URL 集合（已归一化）— 用于去重 */
const defaultNormalizedUrls = new Set(
  defaultSites.map((s) => normalizeUrl(s.url))
);

// ========== 工具函数 ==========

function normalizeUrl(raw: string): string {
  return raw.toLowerCase().replace(/\/+$/, "");
}

function getEdgeConfigId(): string | undefined {
  if (process.env.EDGE_CONFIG_ID) return process.env.EDGE_CONFIG_ID;
  // EDGE_CONFIG 格式: https://edge-config.vercel.com/<id>?token=xxx
  if (process.env.EDGE_CONFIG) {
    try {
      return new URL(process.env.EDGE_CONFIG).pathname.split("/").pop();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * 补全站点缺失字段的默认值 — 防止旧数据缺少字段导致渲染报错
 */
function normalizeSite(raw: Record<string, unknown>): Site {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    url: String(raw.url ?? ""),
    description: String(raw.description ?? ""),
    icon: String(raw.icon || "🌐"),
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
  };
}

/**
 * 稳健解析 Edge Config 返回的用户站点数组
 * value 可能是已解析的数组 [{...}]，也可能是 JSON 字符串 "[{...}]"
 * 数组元素本身也可能是 JSON 字符串（Edge Config 多层序列化的历史问题）
 */
function parseUserSites(value: unknown): Site[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      // 元素可能是 JSON 字符串 → 先 parse
      if (typeof item === "string") {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      }
      return item;
    })
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map(normalizeSite)
    .filter((s) => s.id !== ""); // 过滤空 id 脏数据
}

// ========== 读写用户站点 ==========

/**
 * 从 Edge Config 读取用户站点（纯用户数据，不含固定站点）
 * 优先走 REST API（实时，无 CDN 缓存），SDK 回退
 */
async function readUserSites(): Promise<Site[]> {
  const token = process.env.VERCEL_TOKEN;
  const edgeConfigId = getEdgeConfigId();

  // 1. 优先 REST API — 实时数据
  if (token && edgeConfigId) {
    try {
      const res = await fetch(
        `${VERCEL_API}/v1/edge-config/${edgeConfigId}/items`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        // 从 { items: [{ key, value }, ...] } 中按 key 定位
        if (data && typeof data === "object" && Array.isArray(data.items)) {
          const item = data.items.find(
            (i: unknown) =>
              i &&
              typeof i === "object" &&
              (i as Record<string, unknown>).key === USER_SITES_KEY
          ) as { value?: unknown } | undefined;
          if (item?.value != null) {
            // value 可能是数组，也可能是 JSON 字符串
            if (Array.isArray(item.value)) return parseUserSites(item.value);
            if (typeof item.value === "string") {
              try {
                return parseUserSites(JSON.parse(item.value));
              } catch {
                return [];
              }
            }
          }
        }
      }
    } catch {
      // 回退到 SDK
    }
  }

  // 2. 回退：SDK（有边缘缓存，但至少不会报错）
  const connectionString = process.env.EDGE_CONFIG;
  if (connectionString) {
    try {
      const edgeConfig = createClient(connectionString);
      const raw = await edgeConfig.get<unknown>(USER_SITES_KEY);
      return parseUserSites(raw);
    } catch (err) {
      console.error("Edge Config SDK 读取失败:", err);
    }
  }

  return [];
}

/**
 * 将用户站点列表写入 Edge Config（全量覆盖 user_sites 键）
 * 一次 PATCH 一个 key，不做多余操作
 */
async function writeUserSites(
  sites: Site[]
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const token = process.env.VERCEL_TOKEN;
  const edgeConfigId = getEdgeConfigId();

  if (!token || !edgeConfigId) {
    const missing = [];
    if (!token) missing.push("VERCEL_TOKEN");
    if (!edgeConfigId) missing.push("EDGE_CONFIG_ID（或 EDGE_CONFIG）");
    return { ok: false, reason: `存储服务未配置，缺少环境变量：${missing.join("、")}` };
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
          items: [{ operation: "upsert", key: USER_SITES_KEY, value: sites }],
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "(无法读取响应体)");
      console.error(`Vercel API 写入失败 (${res.status}):`, body);
      return { ok: false, reason: `数据存储失败 (${res.status})` };
    }

    return { ok: true };
  } catch (err) {
    console.error("Vercel API 请求异常:", err);
    return {
      ok: false,
      reason: `请求异常: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ========== 速率限制（仅作用于新增操作） ==========

const addTimestamps = new Map<string, number>();

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

// ========== API Handlers ==========

/**
 * GET /api/sites
 * 返回 固定站点 + 用户站点 → 按 URL 去重合并
 */
export async function GET() {
  const userSites = await readUserSites();

  // 固定站点在前，用户站点追加（跳过与固定站点 URL 重复的脏数据）
  const merged = [...defaultSites];
  const seenUrls = new Set(defaultNormalizedUrls);

  for (const site of userSites) {
    const url = normalizeUrl(site.url);
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      merged.push(site);
    }
  }

  return NextResponse.json(merged);
}

/**
 * POST /api/sites
 * 新增一个用户站点到 Edge Config
 */
export async function POST(request: Request) {
  // 速率限制
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

  const normalizedUrl = normalizeUrl(url);

  // 检查是否与固定站点重复
  if (defaultNormalizedUrls.has(normalizedUrl)) {
    return NextResponse.json({ error: "该网站已存在" }, { status: 409 });
  }

  // 从 URL 生成唯一 id（custom- 前缀区分固定站点）
  const id =
    "custom-" +
    normalizedUrl
      .replace(/^https?:\/\//, "")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  // 读取当前用户站点，检查重复
  const userSites = await readUserSites();
  if (userSites.some((s) => normalizeUrl(s.url) === normalizedUrl)) {
    return NextResponse.json({ error: "该网站已存在" }, { status: 409 });
  }

  const newSite: Site = {
    id,
    name,
    url,
    description: description || "",
    icon: icon || "🌐",
    tags: tags || [],
  };

  const result = await writeUserSites([...userSites, newSite]);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 500 });
  }

  addTimestamps.set(ip, now);
  return NextResponse.json(newSite, { status: 201 });
}

/**
 * DELETE /api/sites?id=xxx
 * 从 Edge Config 删除指定用户站点
 */
export async function DELETE(request: Request) {
  const reqUrl = request.url.includes("://")
    ? new URL(request.url)
    : new URL(request.url, "http://localhost");
  const id = reqUrl.searchParams.get("id");
  const deleteKey = request.headers.get("x-delete-key");

  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }

  // 固定站点不允许删除
  if (defaultIds.has(id)) {
    return NextResponse.json({ error: "基础数据不允许删除" }, { status: 403 });
  }

  const expectedKey = process.env.DELETE_SECRET;
  if (!expectedKey || deleteKey !== expectedKey) {
    return NextResponse.json({ error: "删除密钥错误" }, { status: 403 });
  }

  const userSites = await readUserSites();
  const filtered = userSites.filter((s) => s.id !== id);

  if (filtered.length === userSites.length) {
    return NextResponse.json({ error: "未找到该网站" }, { status: 404 });
  }

  const result = await writeUserSites(filtered);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
