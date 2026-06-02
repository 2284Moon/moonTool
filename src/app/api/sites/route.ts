import { createClient } from "@vercel/edge-config";
import { NextResponse } from "next/server";
import { sites as defaultSites } from "@/data/sites";
import type { Site } from "@/types";

const EDGE_CONFIG_KEY = "sites";
const VERCEL_API = "https://api.vercel.com";
const POST_COOLDOWN_MS = 60_000;

/** 默认站点 ID 集合 — 这些站点不允许删除 */
const defaultIds = new Set(defaultSites.map((s) => s.id));

const addTimestamps = new Map<string, number>();

// ========== 工具函数 ==========

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

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// ========== 读写 Edge Config ==========

/**
 * 补全站点缺失字段的默认值
 * Edge Config 里的旧数据可能缺少 tags、icon 等字段
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
 * 尝试将任意格式的原始值解析为 Site[]
 * 处理两种情况：
 *   - value 已经是解析好的数组 [{...}, {...}]
 *   - value 是 JSON 字符串 "[{...},{...}]"
 */
function tryParseSites(raw: unknown): Site[] | null {
  if (!Array.isArray(raw)) return null;

  const parsed = raw
    .map((item) => {
      // 如果元素是 JSON 字符串，先 parse
      if (typeof item === "string") {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      }
      return item;
    })
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object");

  return parsed.length > 0 ? parsed.map(normalizeSite) : null;
}

/** 从 REST API 响应中提取站点列表（兼容多种返回格式） */
function extractSitesFromApi(data: unknown): Site[] | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  // 格式: { items: [{ key: "sites", value: [...] }] }
  if (Array.isArray(obj.items)) {
    const item = obj.items.find(
      (i: unknown) =>
        i && typeof i === "object" && (i as Record<string, unknown>).key === EDGE_CONFIG_KEY
    ) as { value?: unknown } | undefined;
    if (item && item.value != null) {
      // value 可能是已经解析的数组，也可能是 JSON 字符串
      if (Array.isArray(item.value)) return tryParseSites(item.value);
      if (typeof item.value === "string") {
        try {
          const parsed = JSON.parse(item.value);
          return tryParseSites(parsed);
        } catch {
          return null;
        }
      }
    }
  }

  // 兜底：直接就是数组
  return tryParseSites(data);
}

/**
 * 从 Edge Config 读取所有站点
 * 优先走 REST API（无边缘缓存），SDK 回退
 * 返回值始终包含 defaultSites，且自动合并本地新增的默认站点
 */
async function readSites(): Promise<Site[]> {
  let stored: Site[] | null = null;

  const token = process.env.VERCEL_TOKEN;
  const edgeConfigId = getEdgeConfigId();

  // 1. 优先 REST API — 无 CDN 缓存，实时数据
  if (token && edgeConfigId) {
    try {
      const res = await fetch(`${VERCEL_API}/v1/edge-config/${edgeConfigId}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        stored = extractSitesFromApi(await res.json());
      }
    } catch {
      // 回退到 SDK
    }
  }

  // 2. 回退：SDK 读取（有边缘缓存）
  if (!stored) {
    const connectionString = process.env.EDGE_CONFIG;
    if (connectionString) {
      try {
        const edgeConfig = createClient(connectionString);
        stored = (await edgeConfig.get<Site[]>(EDGE_CONFIG_KEY)) ?? null;
      } catch (err) {
        console.error("Edge Config SDK 读取失败:", err);
      }
    }
  }

  // 3. 没有存储数据 → 写入默认数据并返回
  if (!stored || stored.length === 0) {
    await seedDefaultSites();
    return defaultSites;
  }

  // 4. 归一化存储数据，补全缺失字段
  const normalized = stored.map((s) => normalizeSite(s as unknown as Record<string, unknown>));

  // 5. 检查本地是否有新增的默认站点，自动合并到 Edge Config
  const storedIds = new Set(normalized.map((s) => s.id));
  const newDefaults = defaultSites.filter((s) => !storedIds.has(s.id));

  if (newDefaults.length > 0) {
    const merged = [...normalized, ...newDefaults];
    await writeSites(merged);
    return merged;
  }

  return normalized;
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
    const res = await fetch(`${VERCEL_API}/v1/edge-config/${edgeConfigId}/items`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ operation: "upsert", key: EDGE_CONFIG_KEY, value: sites }],
      }),
    });

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
  const id =
    "custom-" +
    normalizedUrl
      .replace(/^https?:\/\//, "")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const stored = await readSites();

  if (stored.some((s) => s.url.toLowerCase().replace(/\/+$/, "") === normalizedUrl)) {
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

  const result = await writeSites([...stored, newSite]);

  if (!result.ok) {
    if (result.reason === "missing_config") {
      return NextResponse.json(
        {
          error: `存储服务未配置，缺少环境变量：${result.missing.join("、")}。请在 Vercel 后台 → Settings → Environment Variables 中设置`,
        },
        { status: 500 }
      );
    }
    console.error("writeSites api_error:", result.detail);
    return NextResponse.json({ error: "数据存储失败，请稍后重试" }, { status: 500 });
  }

  addTimestamps.set(ip, now);
  return NextResponse.json(newSite, { status: 201 });
}

export async function DELETE(request: Request) {
  const reqUrl = request.url.includes("://")
    ? new URL(request.url)
    : new URL(request.url, "http://localhost");
  const id = reqUrl.searchParams.get("id");
  const deleteKey = request.headers.get("x-delete-key");

  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }

  // 基础数据不允许删除
  if (defaultIds.has(id)) {
    return NextResponse.json({ error: "基础数据不允许删除" }, { status: 403 });
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
        {
          error: `存储服务未配置，缺少环境变量：${result.missing.join("、")}。请在 Vercel 后台 → Settings → Environment Variables 中设置`,
        },
        { status: 500 }
      );
    }
    console.error("writeSites api_error:", result.detail);
    return NextResponse.json({ error: "数据存储失败，请稍后重试" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
