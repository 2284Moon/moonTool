"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  ClipboardPaste,
  Gauge,
  Play,
  RotateCcw,
  Square,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HealthRecord {
  timestamp: number;
  status: "success" | "error";
  latency: number;
  error?: string;
  response?: string;
  statusCode?: number;
}

interface StressSummary {
  total: number;
  success: number;
  error: number;
  successRate: string;
  durationMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  qps: string;
}

type ApiFormat = "openai" | "anthropic" | "gemini";
type AuthStyle = "bearer" | "api-key" | "x-api-key" | "x-goog-api-key";

interface FormatEndpoint {
  url: string;
  authStyle: AuthStyle;
}

interface ProviderPreset {
  id: string;
  name: string;
  aliases: string[];
  defaultFormat: ApiFormat;
  formats: Partial<Record<ApiFormat, FormatEndpoint>>;
  model: string;
}

const DEFAULT_PROMPT =
  "我要去洗车，是走路去还是开车去？简单回答，给出10个字以内的理由";

const PROVIDERS: ProviderPreset[] = [
  {
    id: "openai",
    name: "ChatGPT / OpenAI",
    aliases: ["openai", "chatgpt", "gpt"],
    defaultFormat: "openai",
    formats: {
      openai: { url: "https://api.openai.com/v1/chat/completions", authStyle: "bearer" },
    },
    model: "gpt-4.1-mini",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    aliases: ["anthropic", "claude"],
    defaultFormat: "anthropic",
    formats: {
      anthropic: { url: "https://api.anthropic.com/v1/messages", authStyle: "x-api-key" },
    },
    model: "claude-sonnet-4-5",
  },
  {
    id: "gemini",
    name: "Gemini",
    aliases: ["gemini", "google", "generativelanguage", "AIza"],
    defaultFormat: "gemini",
    formats: {
      gemini: { url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", authStyle: "x-goog-api-key" },
    },
    model: "gemini-2.5-flash",
  },
  {
    id: "grok",
    name: "Grok / xAI",
    aliases: ["grok", "xai", "x.ai", "api.x.ai"],
    defaultFormat: "openai",
    formats: {
      openai: { url: "https://api.x.ai/v1/chat/completions", authStyle: "bearer" },
    },
    model: "grok-4.3",
  },
  {
    id: "qwen",
    name: "Qwen / 通义千问",
    aliases: ["qwen", "dashscope", "aliyun", "阿里", "通义", "千问"],
    defaultFormat: "openai",
    formats: {
      openai: { url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", authStyle: "bearer" },
    },
    model: "qwen3.6-plus",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    aliases: ["deepseek"],
    defaultFormat: "openai",
    formats: {
      openai: { url: "https://api.deepseek.com/chat/completions", authStyle: "bearer" },
      anthropic: { url: "https://api.deepseek.com/anthropic/v1/messages", authStyle: "x-api-key" },
    },
    model: "deepseek-v4-flash",
  },
  {
    id: "kimi",
    name: "Kimi / 月之暗面",
    aliases: ["kimi", "moonshot", "月之暗面"],
    defaultFormat: "openai",
    formats: {
      openai: { url: "https://api.moonshot.ai/v1/chat/completions", authStyle: "bearer" },
    },
    model: "moonshot-v1-8k",
  },
  {
    id: "glm",
    name: "GLM / 智谱",
    aliases: ["glm", "zhipu", "bigmodel", "智谱"],
    defaultFormat: "openai",
    formats: {
      openai: { url: "https://open.bigmodel.cn/api/paas/v4/chat/completions", authStyle: "bearer" },
    },
    model: "glm-5.1",
  },
  {
    id: "mimo",
    name: "小米 MiMo",
    aliases: ["mimo", "xiaomi", "xiaomimimo", "小米"],
    defaultFormat: "openai",
    formats: {
      openai: { url: "https://api.xiaomimimo.com/v1/chat/completions", authStyle: "api-key" },
      anthropic: { url: "https://api.xiaomimimo.com/anthropic/v1/messages", authStyle: "api-key" },
    },
    model: "mimo-v2.5-pro",
  },
];

const FORMAT_LABEL: Record<ApiFormat, string> = {
  openai: "OpenAI 兼容",
  anthropic: "Anthropic",
  gemini: "Gemini",
};

const AUTH_LABEL: Record<AuthStyle, string> = {
  bearer: "Authorization: Bearer",
  "api-key": "api-key",
  "x-api-key": "x-api-key",
  "x-goog-api-key": "x-goog-api-key",
};

function stripQuotes(value: string) {
  return value.trim().replace(/^["'`]+|["'`,]+$/g, "");
}

function normalizeUrl(inputUrl: string, format: ApiFormat, model: string) {
  const raw = stripQuotes(inputUrl);
  if (!raw) return raw;
  if (format === "gemini") {
    if (raw.includes(":generateContent")) return raw;
    const base = raw.replace(/\/+$/, "");
    const chosenModel = model.trim() || "gemini-2.5-flash";
    if (/\/models\/[^/]+$/i.test(base)) return `${base}:generateContent`;
    if (/generativelanguage\.googleapis\.com/i.test(base)) {
      return `${base}/models/${chosenModel}:generateContent`;
    }
    return raw;
  }
  if (/\/(chat\/completions|messages|responses)(\/)?$/i.test(raw)) return raw;
  const base = raw.replace(/\/+$/, "");
  if (format === "anthropic")
    return `${base}/v1/messages`.replace(/\/v1\/v1\//, "/v1/");
  return `${base}/chat/completions`.replace(
    /\/v1\/chat\/completions\/chat\/completions$/,
    "/v1/chat/completions",
  );
}

function findProvider(value: string) {
  const haystack = value.toLowerCase();
  return PROVIDERS.find((provider) => {
    return provider.aliases.some((alias) =>
      haystack.includes(alias.toLowerCase()),
    );
  });
}

function extractConfig(text: string) {
  const urls = Array.from(text.matchAll(/https?:\/\/[^\s"'\\)]+/gi)).map(
    (match) => stripQuotes(match[0]),
  );
  const headerKey =
    text.match(
      /(?:Authorization:\s*Bearer|["']Authorization["']\s*:\s*["']Bearer)\s+([^"'\s\\]+)/i,
    )?.[1] ||
    text.match(
      /(?:x-api-key|api-key|x-goog-api-key)\s*:\s*["']?\$?\{?([^"'\s\\}]+)\}?/i,
    )?.[1];
  const assignedKey = text.match(
    /(?:api[_-]?key|auth[_-]?token|access[_-]?token|secret|token)\s*[:=]\s*["']([^"']+)["']/i,
  )?.[1];
  const prefixedKey = text.match(
    /["']?((?:sk-[a-zA-Z0-9_\-.]+|sk-ant-[a-zA-Z0-9_\-.]+|xai-[a-zA-Z0-9_\-.]+|AIza[a-zA-Z0-9_\-]+))["']?/i,
  )?.[1];
  const model =
    text.match(/["']model["']\s*[:=]\s*["']([^"']+)["']/i)?.[1] ||
    text.match(/model\s*=\s*["']([^"']+)["']/i)?.[1];
  const provider = findProvider(text);
  const url =
    urls.find((item) =>
      /chat\/completions|messages|generateContent/i.test(item),
    ) || urls[0];
  const format: ApiFormat | undefined =
    /generateContent|generativelanguage|gemini/i.test(text)
      ? "gemini"
      : /anthropic|claude|\/messages/i.test(text)
        ? "anthropic"
        : provider?.defaultFormat;
  const authStyle: AuthStyle | undefined = /x-goog-api-key/i.test(text)
    ? "x-goog-api-key"
    : /x-api-key/i.test(text)
      ? "x-api-key"
      : /api-key/i.test(text)
        ? "api-key"
        : /Authorization:\s*Bearer/i.test(text)
          ? "bearer"
          : format && provider?.formats[format]?.authStyle;

  return {
    url,
    key: stripQuotes(headerKey || assignedKey || prefixedKey || ""),
    model: model ? stripQuotes(model) : undefined,
    format,
    authStyle,
    provider,
  };
}

function shortKey(key: string) {
  if (!key) return "未填写";
  if (key.length <= 14) return key;
  return `${key.slice(0, 7)}...${key.slice(-5)}`;
}

export function ApiHealthChecker() {
  const [providerId, setProviderId] = useState("custom");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [format, setFormat] = useState<ApiFormat>("openai");
  const [authStyle, setAuthStyle] = useState<AuthStyle>("bearer");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [pasteText, setPasteText] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState(30);
  const [timeoutSeconds, setTimeoutSeconds] = useState(60);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<
    "idle" | "checking" | "success" | "error"
  >("idle");
  const [lastDetected, setLastDetected] =
    useState<string>("等待粘贴配置或选择厂商");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [stressTotal, setStressTotal] = useState(20);
  const [stressConcurrency, setStressConcurrency] = useState(5);
  const [stressState, setStressState] = useState<"idle" | "running" | "done">(
    "idle",
  );
  const [stressProgress, setStressProgress] = useState({
    completed: 0,
    success: 0,
    error: 0,
    total: 0,
  });
  const [stressSummary, setStressSummary] = useState<StressSummary | null>(
    null,
  );
  const stressStopRef = useRef(false);

  const requestUrl = useMemo(
    () => normalizeUrl(url, format, model),
    [format, model, url],
  );

  const applyProvider = (provider: ProviderPreset, fmt?: ApiFormat) => {
    const selectedFormat = fmt || provider.defaultFormat;
    const endpoint = provider.formats[selectedFormat];
    setProviderId(provider.id);
    setModel(provider.model);
    setFormat(selectedFormat);
    if (endpoint) {
      setUrl(endpoint.url);
      setAuthStyle(endpoint.authStyle);
    }
    setLastDetected(`已套用 ${provider.name}`);
  };

  const handleFormatChange = (nextFormat: ApiFormat | null) => {
    if (!nextFormat) return;
    setFormat(nextFormat);
    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (provider) {
      const endpoint = provider.formats[nextFormat];
      if (endpoint) {
        setUrl(endpoint.url);
        setAuthStyle(endpoint.authStyle);
      }
    } else {
      if (nextFormat === "gemini") setAuthStyle("x-goog-api-key");
      if (nextFormat === "anthropic" && authStyle === "bearer") setAuthStyle("x-api-key");
    }
  };

  const applyExtractedConfig = (text: string) => {
    const extracted = extractConfig(text);
    const provider = extracted.provider;
    if (provider) {
      const detectedFormat = extracted.format || provider.defaultFormat;
      const endpoint = provider.formats[detectedFormat];
      setProviderId(provider.id);
      setModel(provider.model);
      setFormat(detectedFormat);
      if (endpoint) {
        setUrl(endpoint.url);
        setAuthStyle(endpoint.authStyle);
      }
    }
    if (extracted.format && !provider) setFormat(extracted.format);
    if (extracted.authStyle && !provider) setAuthStyle(extracted.authStyle);
    if (extracted.url)
      setUrl(
        normalizeUrl(
          extracted.url,
          extracted.format || provider?.defaultFormat || format,
          extracted.model || model,
        ),
      );
    if (extracted.key) setApiKey(extracted.key);
    if (extracted.model) setModel(extracted.model);
    setLastDetected(
      [
        provider ? provider.name : "自定义配置",
        extracted.url ? "URL" : "",
        extracted.key ? "Key" : "",
        extracted.model ? "模型" : "",
      ]
        .filter(Boolean)
        .join(" · ") || "未识别到 URL 或 Key",
    );
  };

  const checkHealth = useCallback(async () => {
    if (!requestUrl.trim() || !model.trim()) return;

    setCurrentStatus("checking");
    const startTime = Date.now();

    try {
      const res = await fetch("/api/api-health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: requestUrl,
          apiKey,
          model,
          format,
          authStyle,
          prompt,
          timeoutMs: timeoutSeconds * 1000,
        }),
      });
      const latency = Date.now() - startTime;
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setRecords((prev) => [
          ...prev.slice(-119),
          {
            timestamp: Date.now(),
            status: "success",
            latency,
            response: String(data.response || "").slice(0, 160),
            statusCode: data.statusCode,
          },
        ]);
        setCurrentStatus("success");
      } else {
        setRecords((prev) => [
          ...prev.slice(-119),
          {
            timestamp: Date.now(),
            status: "error",
            latency,
            error: String(data.error || `HTTP ${res.status}`).slice(0, 220),
            statusCode: data.statusCode || res.status,
          },
        ]);
        setCurrentStatus("error");
      }
    } catch (err) {
      setRecords((prev) => [
        ...prev.slice(-119),
        {
          timestamp: Date.now(),
          status: "error",
          latency: Date.now() - startTime,
          error: err instanceof Error ? err.message : "未知错误",
        },
      ]);
      setCurrentStatus("error");
    }
  }, [apiKey, authStyle, format, model, prompt, requestUrl, timeoutSeconds]);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startMonitoring = () => {
    if (!requestUrl.trim() || !model.trim()) return;
    stopTimer();
    setIsRunning(true);
    setRecords([]);
    void checkHealth();
    timerRef.current = setInterval(
      () => {
        void checkHealth();
      },
      Math.max(1, intervalSeconds) * 1000,
    );
  };

  const stopMonitoring = () => {
    setIsRunning(false);
    setCurrentStatus("idle");
    stopTimer();
  };

  const resetRecords = () => {
    setRecords([]);
    setCurrentStatus("idle");
  };

  const startStressTest = () => {
    if (!requestUrl.trim() || !model.trim() || isRunning) return;

    const cfg = {
      url: requestUrl,
      apiKey,
      model,
      format,
      authStyle,
      prompt,
      timeoutMs: timeoutSeconds * 1000,
    };
    const total = Math.min(500, Math.max(1, Math.round(stressTotal) || 1));
    const workers = Math.min(
      total,
      Math.min(50, Math.max(1, Math.round(stressConcurrency) || 1)),
    );

    stressStopRef.current = false;
    setStressSummary(null);
    setStressProgress({ completed: 0, success: 0, error: 0, total });
    setStressState("running");

    const latencies: number[] = [];
    let nextIndex = 0;
    let success = 0;
    let error = 0;
    const startedAt = Date.now();

    const runOne = async () => {
      const requestStart = Date.now();
      try {
        const res = await fetch("/api/api-health-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cfg),
        });
        const data = await res.json().catch(() => ({}));
        latencies.push(Date.now() - requestStart);
        if (res.ok && data.ok) success += 1;
        else error += 1;
      } catch {
        latencies.push(Date.now() - requestStart);
        error += 1;
      }
      setStressProgress({ completed: success + error, success, error, total });
    };

    const worker = async () => {
      for (;;) {
        if (stressStopRef.current) break;
        if (nextIndex >= total) break;
        nextIndex += 1;
        await runOne();
      }
    };

    void Promise.all(Array.from({ length: workers }, () => worker())).then(
      () => {
        const durationMs = Date.now() - startedAt;
        const done = success + error;
        const sorted = [...latencies].sort((a, b) => a - b);
        const sum = sorted.reduce((acc, value) => acc + value, 0);
        const p95Index = Math.min(
          sorted.length - 1,
          Math.floor(sorted.length * 0.95),
        );
        setStressSummary({
          total: done,
          success,
          error,
          successRate: done ? ((success / done) * 100).toFixed(1) : "0",
          durationMs,
          avgMs: done ? Math.round(sum / done) : 0,
          minMs: sorted[0] ?? 0,
          maxMs: sorted[sorted.length - 1] ?? 0,
          p95Ms: sorted.length ? sorted[p95Index] : 0,
          qps:
            done && durationMs > 0
              ? ((done / durationMs) * 1000).toFixed(2)
              : "0",
        });
        setStressState("done");
      },
    );
  };

  const stopStressTest = () => {
    stressStopRef.current = true;
  };

  const stats = useMemo(() => {
    const success = records.filter(
      (record) => record.status === "success",
    ).length;
    const error = records.length - success;
    const avgLatency = records.length
      ? Math.round(
          records.reduce((sum, record) => sum + record.latency, 0) /
            records.length,
        )
      : 0;
    return {
      total: records.length,
      success,
      error,
      availability: records.length
        ? ((success / records.length) * 100).toFixed(1)
        : "0",
      avgLatency,
    };
  }, [records]);

  const recentRecords = records.slice(-60);

  return (
    <div className="w-full space-y-4">
      <Card className="overflow-hidden border-2 py-0">
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">API 活性检测</h2>
              <p className="text-xs text-muted-foreground">
                粘贴配置或选择厂商，按固定间隔发送真实问答请求
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1 text-xs">
              <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
              <span
                className={
                  currentStatus === "success"
                    ? "text-green-600"
                    : currentStatus === "error"
                      ? "text-red-600"
                      : currentStatus === "checking"
                        ? "text-amber-600"
                        : "text-muted-foreground"
                }
              >
                {currentStatus === "success" && "刚刚成功"}
                {currentStatus === "error" && "刚刚失败"}
                {currentStatus === "checking" && "请求中"}
                {currentStatus === "idle" && "空闲"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">厂商预设</label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {PROVIDERS.map((provider) => (
                <Button
                  key={provider.id}
                  type="button"
                  variant={providerId === provider.id ? "default" : "outline"}
                  className="h-auto justify-start px-3 py-2 text-left"
                  onClick={() => applyProvider(provider)}
                >
                  <span className="truncate text-xs">{provider.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">快速粘贴</label>
              <span className="text-xs text-muted-foreground">
                {lastDetected}
              </span>
            </div>
            <textarea
              value={pasteText}
              onChange={(event) => {
                setPasteText(event.target.value);
                applyExtractedConfig(event.target.value);
              }}
              onPaste={(event) => {
                const text = event.clipboardData.getData("text");
                applyExtractedConfig(text);
              }}
              placeholder={`粘贴 .env、curl、Python/JS SDK 配置，例如：\nbase_url="https://api.deepseek.com"\napi_key="sk-..." model="deepseek-v4-flash"`}
              className="h-24 w-full resize-none rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-primary"
              spellCheck={false}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
            <div className="space-y-2">
              <label className="text-sm font-medium">API URL</label>
              <input
                type="url"
                value={url}
                onChange={(event) => {
                  setProviderId("custom");
                  setUrl(event.target.value);
                }}
                placeholder="https://api.example.com/v1/chat/completions"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="truncate text-xs text-muted-foreground">
                实际请求：{requestUrl || "等待填写"}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="text-xs text-muted-foreground">
                已识别：{shortKey(apiKey)}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">API 格式</label>
              <Select
                value={format}
                onValueChange={handleFormatChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const provider = PROVIDERS.find((p) => p.id === providerId);
                    const availableFormats = provider
                      ? Object.keys(provider.formats) as ApiFormat[]
                      : Object.keys(FORMAT_LABEL) as ApiFormat[];
                    return availableFormats.map((value) => (
                      <SelectItem key={value} value={value}>
                        {FORMAT_LABEL[value]}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">认证头</label>
              <Select
                value={authStyle}
                onValueChange={(val: AuthStyle | null) => {
                  if (val) setAuthStyle(val);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AUTH_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">模型</label>
              <input
                type="text"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="gpt-4.1-mini / claude-sonnet-4-5"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">检测问题</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="h-20 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              spellCheck={false}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">间隔（秒）</label>
              <input
                type="number"
                min={1}
                max={3600}
                value={intervalSeconds}
                onChange={(event) =>
                  setIntervalSeconds(
                    Math.max(1, Number(event.target.value) || 1),
                  )
                }
                className="w-28 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">超时（秒）</label>
              <input
                type="number"
                min={5}
                max={3600}
                value={timeoutSeconds}
                onChange={(event) =>
                  setTimeoutSeconds(
                    Math.max(5, Number(event.target.value) || 5),
                  )
                }
                className="w-28 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              {!isRunning ? (
                <Button
                  onClick={startMonitoring}
                  disabled={
                    !requestUrl.trim() ||
                    !model.trim() ||
                    stressState === "running"
                  }
                >
                  <Play className="mr-2 h-4 w-4" /> 开始测试
                </Button>
              ) : (
                <Button variant="destructive" onClick={stopMonitoring}>
                  <Square className="mr-2 h-4 w-4" /> 停止
                </Button>
              )}
              <Button
                variant="outline"
                onClick={resetRecords}
                disabled={isRunning}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> 重置
              </Button>
              <Button
                variant="outline"
                onClick={() => applyExtractedConfig(pasteText)}
              >
                <ClipboardPaste className="mr-2 h-4 w-4" /> 重新识别
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border-2 py-0">
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">并发压测</h2>
              <p className="text-xs text-muted-foreground">
                同时发出多个请求，测试中转站在高并发下是否扛得住
              </p>
            </div>
            {stressState === "running" && (
              <span className="text-xs font-medium text-amber-600">
                压测进行中…
              </span>
            )}
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">总请求数</label>
              <input
                type="number"
                min={1}
                max={500}
                value={stressTotal}
                disabled={stressState === "running"}
                onChange={(event) =>
                  setStressTotal(
                    Math.min(500, Math.max(1, Number(event.target.value) || 1)),
                  )
                }
                className="w-28 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">并发数</label>
              <input
                type="number"
                min={1}
                max={50}
                value={stressConcurrency}
                disabled={stressState === "running"}
                onChange={(event) =>
                  setStressConcurrency(
                    Math.min(50, Math.max(1, Number(event.target.value) || 1)),
                  )
                }
                className="w-28 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              {stressState !== "running" ? (
                <Button
                  onClick={startStressTest}
                  disabled={
                    !requestUrl.trim() || !model.trim() || isRunning
                  }
                >
                  <Zap className="mr-2 h-4 w-4" /> 开始压测
                </Button>
              ) : (
                <Button variant="destructive" onClick={stopStressTest}>
                  <Square className="mr-2 h-4 w-4" /> 停止
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              使用上方相同的 URL / Key / 模型 / 检测问题与超时设置
            </div>
          </div>

          {stressState === "running" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  进度 {stressProgress.completed}/{stressProgress.total}
                </span>
                <span>
                  成功{" "}
                  <span className="text-green-600">
                    {stressProgress.success}
                  </span>{" "}
                  · 失败{" "}
                  <span className="text-red-600">{stressProgress.error}</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${
                      stressProgress.total
                        ? (stressProgress.completed / stressProgress.total) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {stressSummary && stressState === "done" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "请求总数", value: String(stressSummary.total) },
                {
                  label: "成功",
                  value: String(stressSummary.success),
                  color: "text-green-600",
                },
                {
                  label: "失败",
                  value: String(stressSummary.error),
                  color: "text-red-600",
                },
                {
                  label: "成功率",
                  value: `${stressSummary.successRate}%`,
                  color:
                    Number(stressSummary.successRate) >= 100
                      ? "text-green-600"
                      : "text-amber-600",
                },
                {
                  label: "总耗时",
                  value: `${(stressSummary.durationMs / 1000).toFixed(1)}s`,
                },
                { label: "QPS", value: stressSummary.qps },
                { label: "平均延迟", value: `${stressSummary.avgMs}ms` },
                { label: "P95 延迟", value: `${stressSummary.p95Ms}ms` },
                { label: "最快", value: `${stressSummary.minMs}ms` },
                { label: "最慢", value: `${stressSummary.maxMs}ms` },
              ].map((item) => (
                <div key={item.label} className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">
                    {item.label}
                  </div>
                  <div
                    className={`mt-1 truncate text-lg font-bold ${item.color || ""}`}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 p-4">
          <div className="text-xs text-muted-foreground">总请求</div>
          <div className="mt-1 text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card className="border-2 p-4">
          <div className="text-xs text-muted-foreground">可用率</div>
          <div className="mt-1 text-2xl font-bold text-green-600">
            {stats.availability}%
          </div>
        </Card>
        <Card className="border-2 p-4">
          <div className="text-xs text-muted-foreground">成功 / 失败</div>
          <div className="mt-1 text-2xl font-bold">
            <span className="text-green-600">{stats.success}</span>
            <span className="mx-1 text-muted-foreground">/</span>
            <span className="text-red-600">{stats.error}</span>
          </div>
        </Card>
        <Card className="border-2 p-4">
          <div className="text-xs text-muted-foreground">平均延迟</div>
          <div className="mt-1 text-2xl font-bold">{stats.avgLatency}ms</div>
        </Card>
      </div>

      <Card className="overflow-hidden border-2 py-0">
        <div className="border-b bg-muted/50 px-4 py-3">
          <h2 className="text-sm font-semibold">活性柱状图</h2>
          <p className="text-xs text-muted-foreground">
            绿色代表单位请求成功，红色代表失败；悬停可看时间、延迟和回复
          </p>
        </div>
        <div className="p-4">
          {recentRecords.length ? (
            <div className="overflow-x-auto pb-2">
              <div className="flex min-h-28 items-end gap-1 pt-9">
                {recentRecords.map((record, index) => {
                  const requestTime = new Date(
                    record.timestamp,
                  ).toLocaleTimeString();
                  return (
                    <div
                      key={`${record.timestamp}-${index}`}
                      className="group relative flex h-20 w-4 shrink-0 items-end justify-center"
                    >
                      <div className="pointer-events-none absolute left-1/2 top-0 z-10 w-max -translate-x-1/2 -translate-y-8 rounded-md border bg-popover px-2 py-1 text-[11px] leading-tight text-popover-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        <div>{requestTime}</div>
                        <div
                          className={
                            record.status === "success"
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {record.status === "success" ? "成功" : "失败"} ·{" "}
                          {record.latency}ms
                        </div>
                      </div>
                      <div
                        className={`w-4 rounded-sm transition-transform group-hover:-translate-y-1 ${
                          record.status === "success"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                        style={{
                          height: `${Math.min(72, Math.max(18, record.latency / 18))}px`,
                        }}
                        title={`${record.status === "success" ? "成功" : "失败"} · ${record.latency}ms · ${requestTime}${record.statusCode ? `\nHTTP ${record.statusCode}` : ""}${record.response ? `\n回复: ${record.response}` : ""}${record.error ? `\n错误: ${record.error}` : ""}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              开始测试后这里会出现请求活性柱
            </div>
          )}
        </div>
      </Card>

      {records.length > 0 && (
        <Card className="overflow-hidden border-2 py-0">
          <div className="border-b bg-muted/50 px-4 py-3">
            <h2 className="text-sm font-semibold">检测记录</h2>
            <p className="text-xs text-muted-foreground">
              最近 {Math.min(records.length, 12)} 条
            </p>
          </div>
          <div className="divide-y">
            {records
              .slice(-12)
              .reverse()
              .map((record, index) => (
                <div
                  key={`${record.timestamp}-${index}`}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  {record.status === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span>
                        {record.status === "success" ? "成功" : "失败"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {record.latency}ms
                      </span>
                      {record.statusCode && (
                        <span className="text-xs text-muted-foreground">
                          HTTP {record.statusCode}
                        </span>
                      )}
                    </div>
                    {record.response && (
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        回复：{record.response}
                      </div>
                    )}
                    {record.error && (
                      <div className="mt-1 break-words text-xs text-red-600">
                        错误：{record.error}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(record.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
