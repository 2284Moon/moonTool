import { createClient } from "@vercel/edge-config";
import { NextResponse } from "next/server";
import { sites as defaultSites } from "@/data/sites";
import type { Site } from "@/types";

const EDGE_CONFIG_KEY = "sites";
const VERCEL_API = "https://api.vercel.com";

function getEdgeConfigId(): string | undefined {
  return process.env.EDGE_CONFIG_ID || process.env.EDGE_CONFIG?.split("/").pop();
}

async function readSites(): Promise<Site[]> {
  const connectionString = process.env.EDGE_CONFIG;
  if (!connectionString) return defaultSites;

  const edgeConfig = createClient(connectionString);
  const stored = await edgeConfig.get<Site[]>(EDGE_CONFIG_KEY);
  if (stored && stored.length > 0) return stored;

  await seedDefaultSites();
  return defaultSites;
}

async function seedDefaultSites() {
  const token = process.env.VERCEL_TOKEN;
  const edgeConfigId = getEdgeConfigId();
  if (!token || !edgeConfigId) return;

  try {
    await fetch(`${VERCEL_API}/v1/edge-config/${edgeConfigId}/items`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          { operation: "upsert", key: EDGE_CONFIG_KEY, value: defaultSites },
        ],
      }),
    });
  } catch {
    // silently fail
  }
}

async function writeSites(sites: Site[]): Promise<boolean> {
  const token = process.env.VERCEL_TOKEN;
  const edgeConfigId = getEdgeConfigId();
  if (!token || !edgeConfigId) return false;

  const res = await fetch(`${VERCEL_API}/v1/edge-config/${edgeConfigId}/items`, {
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
  });

  return res.ok;
}

export async function GET() {
  const sites = await readSites();
  return NextResponse.json(sites);
}

export async function POST(request: Request) {
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

  const ok = await writeSites([...stored, newSite]);
  if (!ok) {
    return NextResponse.json(
      { error: "存储服务未配置，请在 Vercel 后台连接 Edge Config，并设置 VERCEL_TOKEN 环境变量" },
      { status: 500 }
    );
  }

  return NextResponse.json(newSite, { status: 201 });
}
