"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Copy, X, AlertCircle, Eye, EyeOff, Plus, Trash2,
} from "lucide-react";
import CryptoJS from "crypto-js";

// ====== Base64url 工具函数 ======

function base64UrlEncode(str: string): string {
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(str))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";
  try {
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return atob(base64);
  }
}

// ====== HMAC 签名 ======

const ALGORITHMS = ["HS256", "HS384", "HS512"] as const;
type Algorithm = (typeof ALGORITHMS)[number];

function hmacSign(data: string, secret: string, alg: Algorithm): string {
  const map: Record<Algorithm, (data: string, secret: string) => CryptoJS.lib.WordArray> = {
    HS256: (d, s) => CryptoJS.HmacSHA256(d, s),
    HS384: (d, s) => CryptoJS.HmacSHA384(d, s),
    HS512: (d, s) => CryptoJS.HmacSHA512(d, s),
  };
  return map[alg](data, secret)
    .toString(CryptoJS.enc.Base64)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ====== 时间戳工具 ======

const TIME_CLAIMS = new Set(["iat", "exp", "nbf", "auth_time"]);

function formatTimestamp(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ====== 类型 ======

interface KeyValue {
  key: string;
  value: string;
}

type Mode = "decode" | "encode";

export function JwtDecoder() {
  const [mode, setMode] = useState<Mode>("decode");

  // --- 解码状态 ---
  const [jwtInput, setJwtInput] = useState("");
  const [decParts, setDecParts] = useState<string[]>([]);
  const [decHeader, setDecHeader] = useState<string>("");
  const [decPayload, setDecPayload] = useState<string>("");
  const [decError, setDecError] = useState("");

  // --- 编码状态 ---
  const [encAlgorithm, setEncAlgorithm] = useState<Algorithm>("HS256");
  const [encSecret, setEncSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  // 标准载荷
  const [encIss, setEncIss] = useState("");
  const [encSub, setEncSub] = useState("");
  const [encAud, setEncAud] = useState("");
  const [encJti, setEncJti] = useState("");
  const [encExp, setEncExp] = useState(""); // 秒
  const [encNbf, setEncNbf] = useState(""); // 秒
  const [encAutoIat, setEncAutoIat] = useState(true);
  // 自定义数据
  const [encCustom, setEncCustom] = useState<KeyValue[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  // 结果
  const [encResult, setEncResult] = useState("");
  const [encError, setEncError] = useState("");

  // ====== 解码逻辑 ======

  useEffect(() => {
    if (!jwtInput.trim()) {
      setDecParts([]);
      setDecHeader("");
      setDecPayload("");
      setDecError("");
      return;
    }
    const trimmed = jwtInput.trim();
    const segments = trimmed.split(".");
    if (segments.length < 2 || segments.length > 3) {
      setDecParts([]);
      setDecHeader("");
      setDecPayload("");
      setDecError("无效的 JWT 格式：需要 2-3 个由 . 分隔的部分");
      return;
    }
    setDecParts(segments);
    setDecError("");

    try {
      setDecHeader(JSON.stringify(JSON.parse(base64UrlDecode(segments[0])), null, 2));
    } catch (e) {
      setDecHeader(`解码失败：${(e as Error).message}`);
    }
    try {
      setDecPayload(JSON.stringify(JSON.parse(base64UrlDecode(segments[1])), null, 2));
    } catch (e) {
      setDecPayload(`解码失败：${(e as Error).message}`);
    }
  }, [jwtInput]);

  // ====== 编码逻辑 ======

  const handleGenerate = () => {
    setEncError("");
    setEncResult("");

    if (!encSecret.trim()) {
      setEncError("请输入签名密钥");
      return;
    }

    // 构建 payload
    const payload: Record<string, unknown> = {};

    if (encAutoIat) payload.iat = Math.floor(Date.now() / 1000);
    if (encIss.trim()) payload.iss = encIss.trim();
    if (encSub.trim()) payload.sub = encSub.trim();
    if (encAud.trim()) payload.aud = encAud.trim();
    if (encJti.trim()) payload.jti = encJti.trim();

    if (encExp.trim()) {
      const v = parseInt(encExp);
      if (isNaN(v) || v <= 0) {
        setEncError("过期时间需为大于 0 的数字（秒）");
        return;
      }
      payload.exp = Math.floor(Date.now() / 1000) + v;
    }

    if (encNbf.trim()) {
      const v = parseInt(encNbf);
      if (isNaN(v) || v < 0) {
        setEncError("生效时间需为大于等于 0 的数字（秒）");
        return;
      }
      payload.nbf = Math.floor(Date.now() / 1000) + v;
    }

    for (const { key, value } of encCustom) {
      if (!key.trim()) continue;
      // 尝试解析为 JSON
      try {
        payload[key.trim()] = JSON.parse(value);
      } catch {
        payload[key.trim()] = value;
      }
    }

    if (Object.keys(payload).length === 0) {
      setEncError("请至少填写一个载荷字段");
      return;
    }

    try {
      const header = { alg: encAlgorithm, typ: "JWT" };
      const headerB64 = base64UrlEncode(JSON.stringify(header));
      const payloadB64 = base64UrlEncode(JSON.stringify(payload));
      const signature = hmacSign(`${headerB64}.${payloadB64}`, encSecret, encAlgorithm);
      setEncResult(`${headerB64}.${payloadB64}.${signature}`);
    } catch (e) {
      setEncError(`生成失败：${(e as Error).message}`);
    }
  };

  const handleAddCustom = () => {
    if (!newKey.trim()) return;
    setEncCustom((prev) => [...prev, { key: newKey.trim(), value: newValue }]);
    setNewKey("");
    setNewValue("");
  };

  const handleRemoveCustom = (index: number) => {
    setEncCustom((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
  };

  const handleClearDecode = () => {
    setJwtInput("");
    setDecParts([]);
    setDecHeader("");
    setDecPayload("");
    setDecError("");
  };

  const handleClearEncode = () => {
    setEncSecret("");
    setEncIss("");
    setEncSub("");
    setEncAud("");
    setEncJti("");
    setEncExp("");
    setEncNbf("");
    setEncAutoIat(true);
    setEncCustom([]);
    setEncResult("");
    setEncError("");
  };

  // ====== UI 辅助 ======

  const renderDecPayloadWithTimestamps = () => {
    if (!decPayload || decPayload.startsWith("解码失败")) return null;
    try {
      const obj = JSON.parse(decPayload) as Record<string, unknown>;
      const lines = JSON.stringify(obj, null, 2).split("\n");
      return lines.map((line, i) => {
        const match = line.match(/^(\s*)"(\w+)":\s*(\d+),?$/);
        if (match && TIME_CLAIMS.has(match[2])) {
          const ts = parseInt(match[3]);
          return (
            <div key={i} className="group">
              <span>{line}</span>
              <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                → {formatTimestamp(ts)}
              </span>
            </div>
          );
        }
        return <div key={i}>{line}</div>;
      });
    } catch {
      return <pre className="font-mono text-sm whitespace-pre-wrap">{decPayload}</pre>;
    }
  };

  const labelClass = "text-xs font-medium text-muted-foreground";
  const inputClass = "h-9 font-mono text-sm";

  // ====== Render ======

  return (
    <div className="w-full space-y-4">
      {/* 模式切换 */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant={mode === "decode" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("decode")}
        >
          🔍 解码 JWT
        </Button>
        <Button
          variant={mode === "encode" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("encode")}
        >
          ✏️ 生成 JWT
        </Button>
      </div>

      {/* ============ 解码模式 ============ */}
      {mode === "decode" && (
        <>
          {/* 错误 */}
          {decError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" /> {decError}
            </div>
          )}

          {/* 输入 */}
          <Card className="flex flex-col overflow-hidden border-2 border-dashed border-blue-500/30 bg-card py-0">
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
              <div>
                <h3 className="text-sm font-semibold">📋 粘贴 JWT Token</h3>
                <p className="text-xs text-muted-foreground">Header.Payload.Signature</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleCopy(jwtInput)} disabled={!jwtInput}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={handleClearDecode} disabled={!jwtInput}>
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

          {/* 结构示意 */}
          {decParts.length === 3 && (
            <div className="flex items-center justify-center gap-0 text-xs font-mono">
              <span className="rounded-l-lg bg-red-100 px-3 py-1.5 font-medium text-red-700 dark:bg-red-950 dark:text-red-300">Header</span>
              <span className="bg-red-100 px-2 py-1.5 text-red-400 dark:bg-red-950">.</span>
              <span className="bg-purple-100 px-3 py-1.5 font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">Payload</span>
              <span className="bg-purple-100 px-2 py-1.5 text-purple-400 dark:bg-purple-950">.</span>
              <span className="rounded-r-lg bg-blue-100 px-3 py-1.5 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">Signature</span>
            </div>
          )}

          {/* Header + Payload */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="flex flex-col overflow-hidden border-2 border-dashed border-red-500/30 bg-card py-0">
              <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                <div>
                  <h3 className="text-sm font-semibold">📦 Header</h3>
                  <p className="text-xs text-muted-foreground">算法与令牌类型</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleCopy(decHeader)} disabled={!decHeader}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="bg-muted/20 px-4 py-3 font-mono text-sm leading-relaxed">
                {decHeader ? (
                  <pre className="whitespace-pre-wrap break-all text-foreground">{decHeader}</pre>
                ) : (
                  <p className="text-muted-foreground/50">等待输入 JWT...</p>
                )}
              </div>
            </Card>

            <Card className="flex flex-col overflow-hidden border-2 border-dashed border-purple-500/30 bg-card py-0">
              <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                <div>
                  <h3 className="text-sm font-semibold">📋 Payload</h3>
                  <p className="text-xs text-muted-foreground">声明与数据</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleCopy(decPayload)} disabled={!decPayload}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="bg-muted/20 px-4 py-3 font-mono text-sm leading-relaxed">
                {decPayload ? (
                  <div className="whitespace-pre-wrap break-all text-foreground">
                    {renderDecPayloadWithTimestamps()}
                  </div>
                ) : (
                  <p className="text-muted-foreground/50">等待输入 JWT...</p>
                )}
              </div>
            </Card>
          </div>

          {decParts.length === 3 && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              签名验证需要密钥，由服务端完成。此处仅解码展示内容。
            </div>
          )}
        </>
      )}

      {/* ============ 编码模式 ============ */}
      {mode === "encode" && (
        <>
          {encError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" /> {encError}
            </div>
          )}

          {/* 签名配置 */}
          <Card className="space-y-4 p-5">
            <h3 className="text-sm font-semibold">🔑 签名配置</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className={labelClass}>签名算法</label>
                <select
                  value={encAlgorithm}
                  onChange={(e) => setEncAlgorithm(e.target.value as Algorithm)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {ALGORITHMS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>签名密钥</label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={encSecret}
                    onChange={(e) => setEncSecret(e.target.value)}
                    placeholder="输入签名密钥"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 pr-9 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* 标准载荷 */}
          <Card className="space-y-4 p-5">
            <h3 className="text-sm font-semibold">📋 标准载荷（可选）</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Issuer <span className="font-mono text-muted-foreground/60">iss</span>
                </label>
                <input
                  className={inputClass + " w-full rounded-md border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring"}
                  placeholder="签发者"
                  value={encIss}
                  onChange={(e) => setEncIss(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Subject <span className="font-mono text-muted-foreground/60">sub</span>
                </label>
                <input
                  className={inputClass + " w-full rounded-md border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring"}
                  placeholder="主题/用户ID"
                  value={encSub}
                  onChange={(e) => setEncSub(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Audience <span className="font-mono text-muted-foreground/60">aud</span>
                </label>
                <input
                  className={inputClass + " w-full rounded-md border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring"}
                  placeholder="接收方"
                  value={encAud}
                  onChange={(e) => setEncAud(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>
                  JWT ID <span className="font-mono text-muted-foreground/60">jti</span>
                </label>
                <input
                  className={inputClass + " w-full rounded-md border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring"}
                  placeholder="唯一标识"
                  value={encJti}
                  onChange={(e) => setEncJti(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>
                  过期时间 <span className="font-mono text-muted-foreground/60">exp</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    className={inputClass + " w-24 rounded-md border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring"}
                    placeholder="3600"
                    value={encExp}
                    onChange={(e) => setEncExp(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">秒后过期</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>
                  生效时间 <span className="font-mono text-muted-foreground/60">nbf</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    className={inputClass + " w-24 rounded-md border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring"}
                    placeholder="0"
                    value={encNbf}
                    onChange={(e) => setEncNbf(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">秒后生效</span>
                </div>
              </div>
              <div className="flex items-end space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={encAutoIat}
                    onChange={(e) => setEncAutoIat(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  自动添加签发时间 <span className="font-mono text-muted-foreground/60">iat</span>
                </label>
              </div>
            </div>
          </Card>

          {/* 自定义数据 */}
          <Card className="space-y-4 p-5">
            <h3 className="text-sm font-semibold">📝 自定义数据</h3>

            {/* 输入行 */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 space-y-1.5" style={{ minWidth: 120 }}>
                <label className={labelClass}>Key</label>
                <input
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm placeholder:text-muted-foreground/40 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="字段名"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
                />
              </div>
              <div className="flex-[2] space-y-1.5" style={{ minWidth: 160 }}>
                <label className={labelClass}>Value</label>
                <input
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm placeholder:text-muted-foreground/40 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="值，支持 JSON 如 123、true、[1,2]"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCustom}
                disabled={!newKey.trim()}
                className="h-9 shrink-0"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> 添加
              </Button>
            </div>

            {/* 数据列表 */}
            {encCustom.length > 0 && (
              <>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  已添加 {encCustom.length} 个字段
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <tbody>
                      {encCustom.map((kv, i) => (
                        <tr
                          key={i}
                          className="border-t first:border-t-0 transition-colors hover:bg-muted/30"
                        >
                          <td className="w-[140px] px-4 py-2.5">
                            <span className="inline-block rounded-md border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-mono text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              {kv.key}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-sm text-foreground/80">
                            {kv.value || (
                              <span className="italic text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="w-12 px-2 py-2.5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 rounded-md p-0 text-muted-foreground/50 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                              onClick={() => handleRemoveCustom(i)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

          {/* 生成按钮 + 清空 */}
          <div className="flex items-center justify-center gap-2">
            <Button onClick={handleGenerate} size="sm">生成 JWT</Button>
            <Button variant="outline" size="sm" onClick={handleClearEncode}>
              清空
            </Button>
          </div>

          {/* 结果 */}
          {encResult && (
            <Card className="flex flex-col overflow-hidden border-2 border-dashed border-green-500/30 bg-card py-0">
              <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                <div>
                  <h3 className="text-sm font-semibold">🎉 生成的 Token</h3>
                  <p className="text-xs text-muted-foreground">{encAlgorithm} 签名</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleCopy(encResult)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="bg-muted/20 px-4 py-3">
                <pre className="whitespace-pre-wrap break-all font-mono text-sm text-foreground">{encResult}</pre>
              </div>
            </Card>
          )}

          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            仅支持 HMAC 算法（HS256/HS384/HS512），RSA/ECDSA 需服务端私钥。
          </div>
        </>
      )}
    </div>
  );
}
