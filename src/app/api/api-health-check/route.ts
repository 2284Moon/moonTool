import { NextResponse } from "next/server";

type ApiFormat = "openai" | "anthropic" | "gemini";
type AuthStyle = "bearer" | "api-key" | "x-api-key" | "x-goog-api-key";

interface CheckRequest {
  url?: string;
  apiKey?: string;
  model?: string;
  format?: ApiFormat;
  authStyle?: AuthStyle;
  prompt?: string;
  timeoutMs?: number;
}

function buildHeaders(apiKey: string, format: ApiFormat, authStyle: AuthStyle) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (format === "anthropic") {
    headers["anthropic-version"] = "2023-06-01";
  }

  if (!apiKey.trim()) return headers;

  if (authStyle === "bearer") headers.Authorization = `Bearer ${apiKey}`;
  if (authStyle === "api-key") headers["api-key"] = apiKey;
  if (authStyle === "x-api-key") headers["x-api-key"] = apiKey;
  if (authStyle === "x-goog-api-key") headers["x-goog-api-key"] = apiKey;

  return headers;
}

function buildRequestBody(format: ApiFormat, model: string, prompt: string) {
  if (format === "anthropic") {
    return {
      model,
      max_tokens: 64,
      stream: false,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
      ],
    };
  }

  if (format === "gemini") {
    return {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 64,
        temperature: 0,
      },
    };
  }

  return {
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 64,
    temperature: 0,
    stream: false,
  };
}

function extractText(data: unknown): string {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "";

  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj.choices) && obj.choices[0]) {
    const choice = obj.choices[0] as Record<string, unknown>;
    const message = choice.message as Record<string, unknown> | undefined;
    if (typeof message?.content === "string") return message.content;
    if (Array.isArray(message?.content)) {
      return message.content
        .map((part) => (typeof part === "object" && part ? String((part as Record<string, unknown>).text || "") : ""))
        .filter(Boolean)
        .join("");
    }
    if (typeof choice.text === "string") return choice.text;
  }

  if (Array.isArray(obj.content)) {
    return obj.content
      .map((part) => (typeof part === "object" && part ? String((part as Record<string, unknown>).text || "") : ""))
      .filter(Boolean)
      .join("");
  }

  if (Array.isArray(obj.candidates) && obj.candidates[0]) {
    const candidate = obj.candidates[0] as Record<string, unknown>;
    const content = candidate.content as Record<string, unknown> | undefined;
    if (Array.isArray(content?.parts)) {
      return content.parts
        .map((part) => (typeof part === "object" && part ? String((part as Record<string, unknown>).text || "") : ""))
        .filter(Boolean)
        .join("");
    }
  }

  if (typeof obj.output_text === "string") return obj.output_text;
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.result === "string") return obj.result;

  return JSON.stringify(data).slice(0, 500);
}

function extractError(data: unknown) {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "请求失败";
  const obj = data as Record<string, unknown>;
  const error = obj.error as Record<string, unknown> | string | undefined;
  if (typeof error === "string") return error;
  if (error?.message) return String(error.message);
  if (obj.message) return String(obj.message);
  return JSON.stringify(data).slice(0, 500);
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as CheckRequest;
  const url = payload.url?.trim();
  const apiKey = payload.apiKey?.trim() || "";
  const model = payload.model?.trim();
  const format = payload.format || "openai";
  const authStyle = payload.authStyle || (format === "gemini" ? "x-goog-api-key" : "bearer");
  const prompt = payload.prompt?.trim() || "我要去洗车，是走路去还是开车去？简单回答，给出10个字以内的理由";
  const timeoutMs = Math.min(Math.max(payload.timeoutMs || 60000, 5000), 3600000);

  if (!url) {
    return NextResponse.json({ ok: false, error: "缺少 API URL" }, { status: 400 });
  }

  if (!model && format !== "gemini") {
    return NextResponse.json({ ok: false, error: "缺少模型名称" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(apiKey, format, authStyle),
      body: JSON.stringify(buildRequestBody(format, model || "gemini-2.5-flash", prompt)),
      signal: controller.signal,
    });

    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, statusCode: res.status, error: extractError(data) },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ok: true,
      statusCode: res.status,
      response: extractText(data),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "请求异常";
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  } finally {
    clearTimeout(timer);
  }
}
