"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, X, AlertCircle, ChevronDown } from "lucide-react";

// base64url → base64 → decode
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // 补齐 padding
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  try {
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    // fallback: 二进制内容直接返回 atob 结果
    return atob(base64);
  }
}

// 已知时间戳字段
const TIME_CLAIMS = new Set(["iat", "exp", "nbf", "auth_time"]);

function formatTimestamp(seconds: number): string {
  const d = new Date(seconds * 1000);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface DecodedPart {
  raw: object;
  pretty: string;
  error?: string;
}

export function JwtDecoder() {
  const [jwtInput, setJwtInput] = useState("");
  const [parts, setParts] = useState<string[]>([]);
  const [header, setHeader] = useState<DecodedPart | null>(null);
  const [payload, setPayload] = useState<DecodedPart | null>(null);
  const [error, setError] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    header: true,
    payload: true,
  });

  useEffect(() => {
    if (!jwtInput.trim()) {
      setParts([]);
      setHeader(null);
      setPayload(null);
      setError("");
      return;
    }

    const trimmed = jwtInput.trim();
    const segments = trimmed.split(".");

    if (segments.length < 2 || segments.length > 3) {
      setParts([]);
      setHeader(null);
      setPayload(null);
      setError("无效的 JWT 格式：需要 2-3 个由 . 分隔的部分");
      return;
    }

    setParts(segments);

    // 解码 Header
    try {
      const headerStr = base64UrlDecode(segments[0]);
      const headerObj = JSON.parse(headerStr);
      setHeader({
        raw: headerObj,
        pretty: JSON.stringify(headerObj, null, 2),
      });
    } catch (e) {
      setHeader({ raw: {}, pretty: "", error: `Header 解码失败：${(e as Error).message}` });
    }

    // 解码 Payload
    try {
      const payloadStr = base64UrlDecode(segments[1]);
      const payloadObj = JSON.parse(payloadStr);
      setPayload({
        raw: payloadObj,
        pretty: JSON.stringify(payloadObj, null, 2),
      });
    } catch (e) {
      setPayload({ raw: {}, pretty: "", error: `Payload 解码失败：${(e as Error).message}` });
    }

    setError("");
  }, [jwtInput]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    setJwtInput("");
    setParts([]);
    setHeader(null);
    setPayload(null);
    setError("");
  };

  const toggleSection = (section: "header" | "payload") => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // 高亮时间戳字段的 payload JSON
  const renderPayloadWithTimestamps = () => {
    if (!payload || payload.error) return null;
    try {
      const obj = payload.raw as Record<string, unknown>;
      const lines = JSON.stringify(obj, null, 2).split("\n");
      return lines.map((line, i) => {
        const match = line.match(/^(\s*)"(\w+)":\s*(\d+),?$/);
        if (match && TIME_CLAIMS.has(match[2])) {
          const ts = parseInt(match[3]);
          return (
            <div key={i} className="group">
              <span className="text-foreground/70">{line}</span>
              <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                {/* → {formatTimestamp(ts)} */}
                → {formatTimestamp(ts)}
              </span>
            </div>
          );
        }
        return <div key={i}>{line}</div>;
      });
    } catch {
      return <pre className="font-mono text-sm">{payload.pretty}</pre>;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-lg font-semibold">🔐 JWT 解析器</h2>
        <p className="text-sm text-muted-foreground">
          在线解码 JSON Web Token，查看 Header 和 Payload
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* JWT 输入 */}
      <Card className="flex flex-col overflow-hidden border-2 border-dashed border-blue-500/30 bg-card py-0">
        <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
          <div>
            <h3 className="text-sm font-semibold">📋 粘贴 JWT Token</h3>
            <p className="text-xs text-muted-foreground">
              支持标准的 Header.Payload.Signature 格式
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => handleCopy(jwtInput)}
              disabled={!jwtInput}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleClear}
              disabled={!jwtInput}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <textarea
          value={jwtInput}
          onChange={(e) => setJwtInput(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
          className="h-[160px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          spellCheck={false}
        />
      </Card>

      {/* JWT 结构示意 */}
      {parts.length === 3 && (
        <div className="flex items-center justify-center gap-0 text-xs font-mono">
          <span className="rounded-l-lg bg-red-100 px-3 py-1.5 font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
            Header
          </span>
          <span className="bg-red-100 px-2 py-1.5 text-red-400 dark:bg-red-950">
            .
          </span>
          <span className="bg-purple-100 px-3 py-1.5 font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            Payload
          </span>
          <span className="bg-purple-100 px-2 py-1.5 text-purple-400 dark:bg-purple-950">
            .
          </span>
          <span className="rounded-r-lg bg-blue-100 px-3 py-1.5 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            Signature
          </span>
        </div>
      )}

      {/* 结果区域 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Header */}
        <Card className="flex flex-col overflow-hidden border-2 border-dashed border-red-500/30 bg-card py-0">
          <div
            className="flex cursor-pointer items-center justify-between border-b bg-muted/50 px-4 py-2"
            onClick={() => toggleSection("header")}
          >
            <div>
              <h3 className="text-sm font-semibold">📦 Header</h3>
              <p className="text-xs text-muted-foreground">
                算法与令牌类型
              </p>
            </div>
            <div className="flex items-center gap-1">
              {header && !header.error && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(header.pretty);
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              )}
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  expandedSections.header ? "" : "-rotate-90"
                }`}
              />
            </div>
          </div>
          {expandedSections.header && (
            <div className="bg-muted/20 px-4 py-3 font-mono text-sm leading-relaxed">
              {header ? (
                header.error ? (
                  <p className="text-red-500">{header.error}</p>
                ) : (
                  <pre className="whitespace-pre-wrap break-all text-foreground">
                    {header.pretty}
                  </pre>
                )
              ) : (
                <p className="text-muted-foreground/50">
                  等待输入 JWT...
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Payload */}
        <Card className="flex flex-col overflow-hidden border-2 border-dashed border-purple-500/30 bg-card py-0">
          <div
            className="flex cursor-pointer items-center justify-between border-b bg-muted/50 px-4 py-2"
            onClick={() => toggleSection("payload")}
          >
            <div>
              <h3 className="text-sm font-semibold">📋 Payload</h3>
              <p className="text-xs text-muted-foreground">
                声明与数据
              </p>
            </div>
            <div className="flex items-center gap-1">
              {payload && !payload.error && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(payload.pretty);
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              )}
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  expandedSections.payload ? "" : "-rotate-90"
                }`}
              />
            </div>
          </div>
          {expandedSections.payload && (
            <div className="bg-muted/20 px-4 py-3 font-mono text-sm leading-relaxed">
              {payload ? (
                payload.error ? (
                  <p className="text-red-500">{payload.error}</p>
                ) : (
                  <div className="whitespace-pre-wrap break-all text-foreground">
                    {renderPayloadWithTimestamps()}
                  </div>
                )
              ) : (
                <p className="text-muted-foreground/50">
                  等待输入 JWT...
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* 签名提示 */}
      {parts.length === 3 && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          签名验证需要密钥，由服务端完成。此处仅解码展示 JWT 内容。
        </div>
      )}
    </div>
  );
}
