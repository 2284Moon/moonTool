"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Copy,
  Check,
  Link2,
  Download,
  QrCode,
  AlertCircle,
  Upload,
  Globe,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import QRCode from "qrcode";

type InputMode = "url" | "file" | "text";
type TargetClient = "clash" | "shadowrocket";
type OutputMode = "link" | "download" | "qrcode";

interface TargetOption {
  id: TargetClient;
  label: string;
  description: string;
  ext: string;
}

const TARGET_OPTIONS: TargetOption[] = [
  {
    id: "clash",
    label: "Clash / Clash Verge / Mihomo",
    description: "输出标准 YAML 配置，包含 proxies、proxy-groups 和分流规则",
    ext: "yaml",
  },
  {
    id: "shadowrocket",
    label: "Shadowrocket (小火箭)",
    description: "输出 Base64 编码的标准 URI 节点列表",
    ext: "txt",
  },
];

const INPUT_TABS: { id: InputMode; label: string; icon: React.ReactNode }[] = [
  { id: "url", label: "订阅 URL", icon: <Globe className="h-3.5 w-3.5" /> },
  { id: "file", label: "上传文件", icon: <Upload className="h-3.5 w-3.5" /> },
  { id: "text", label: "粘贴文本", icon: <FileText className="h-3.5 w-3.5" /> },
];

const OUTPUT_TABS: { id: OutputMode; label: string; icon: React.ReactNode }[] = [
  { id: "link", label: "订阅链接", icon: <Link2 className="h-3.5 w-3.5" /> },
  { id: "download", label: "文件下载", icon: <Download className="h-3.5 w-3.5" /> },
  { id: "qrcode", label: "二维码", icon: <QrCode className="h-3.5 w-3.5" /> },
];

export function SubscriptionConverter() {
  // 输入状态
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");

  // 目标与输出
  const [target, setTarget] = useState<TargetClient>("clash");
  const [outputMode, setOutputMode] = useState<OutputMode>("link");

  // 结果状态
  const [result, setResult] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // 生成二维码
  useEffect(() => {
    if (!result && !apiUrl) {
      setQrDataUrl("");
      return;
    }
    const text = inputMode === "url" ? apiUrl : result;
    if (!text) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(text, { width: 240, margin: 2, errorCorrectionLevel: "M" })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch(() => setQrDataUrl(""));
  }, [result, apiUrl, inputMode]);

  // 切换输入模式时重置
  const switchInputMode = useCallback((mode: InputMode) => {
    setInputMode(mode);
    setError("");
    setResult("");
    setApiUrl("");
    setQrDataUrl("");
  }, []);

  // 文件上传处理
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileContent(String(ev.target?.result || ""));
    };
    reader.onerror = () => setError("文件读取失败");
    reader.readAsText(file);
  }, []);

  // 获取实际输入内容
  const getInputContent = useCallback((): { mode: InputMode; value: string } => {
    switch (inputMode) {
      case "url":
        return { mode: "url", value: url.trim() };
      case "file":
        return { mode: "file", value: fileContent };
      case "text":
        return { mode: "text", value: textContent.trim() };
    }
  }, [inputMode, url, fileContent, textContent]);

  // 转换核心
  const handleConvert = async () => {
    setError("");
    setResult("");
    setApiUrl("");
    setLoading(true);

    const { mode, value } = getInputContent();

    try {
      if (mode === "url") {
        if (!value) {
          setError("请输入订阅地址");
          setLoading(false);
          return;
        }
        try {
          new URL(value);
        } catch {
          setError("请输入有效的 URL 地址");
          setLoading(false);
          return;
        }

        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const convertUrl = `${origin}/api/convert?url=${encodeURIComponent(value)}&target=${target}`;
        setApiUrl(convertUrl);

        // 同时获取内容用于下载/二维码
        const resp = await fetch(convertUrl);
        const text = await resp.text();
        if (!resp.ok) {
          const data = JSON.parse(text);
          setError(data.error || "转换失败");
          setLoading(false);
          return;
        }
        setResult(text);
      } else {
        if (!value) {
          setError(mode === "file" ? "请先上传文件" : "请输入节点文本");
          setLoading(false);
          return;
        }

        const resp = await fetch("/api/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: value, target }),
        });
        const text = await resp.text();
        if (!resp.ok) {
          const data = JSON.parse(text);
          setError(data.error || "转换失败");
          setLoading(false);
          return;
        }
        setResult(text);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "转换出错，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 复制
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("复制失败，请手动复制");
    }
  };

  // 下载文件
  const download = () => {
    if (!result) return;
    const opt = TARGET_OPTIONS.find((o) => o.id === target)!;
    const blob = new Blob([result], { type: opt.id === "clash" ? "text/yaml;charset=utf-8" : "text/plain;charset=utf-8" });
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlObj;
    a.download = `subscription.${opt.ext}`;
    a.click();
    URL.revokeObjectURL(urlObj);
  };

  const targetOption = TARGET_OPTIONS.find((o) => o.id === target)!;

  return (
    <div className="w-full space-y-4">
      {/* 输入区域 */}
      <Card className="border-2 p-4 space-y-4">
        {/* 输入方式 Tab */}
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
          {INPUT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchInputMode(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                inputMode === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* 输入内容 */}
        {inputMode === "url" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">订阅地址</label>
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(""); }}
              placeholder="https://example.com/subscription?token=xxx"
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
        )}

        {inputMode === "file" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">上传配置文件</label>
            <div className="mt-1">
              <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed bg-muted/20 transition-colors hover:bg-muted/40">
                <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {fileName || "点击上传 .yaml / .json / .txt 文件"}
                </span>
                <input
                  type="file"
                  accept=".yaml,.yml,.json,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            {fileName && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                <span className="truncate">已选择: {fileName}</span>
                <button onClick={() => { setFileName(""); setFileContent(""); }} className="ml-auto hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {inputMode === "text" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">粘贴节点文本</label>
            <textarea
              value={textContent}
              onChange={(e) => { setTextContent(e.target.value); setError(""); }}
              placeholder={`支持多行节点链接，如：\nvmess://...\nvless://...\ntrojan://...\nss://...\n\n或粘贴 Clash YAML 配置全文`}
              rows={6}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono outline-none transition-colors focus:border-primary resize-y"
            />
          </div>
        )}

        {/* 目标客户端 */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">目标客户端</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as TargetClient)}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
          >
            {TARGET_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">{targetOption.description}</p>
        </div>

        {error && (
          <div className="space-y-1.5 rounded-md bg-destructive/10 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
            {inputMode === "url" && (
              <p className="text-xs text-muted-foreground">
                提示：订阅 URL 在服务器端可能无法直接访问，建议切换到「粘贴文本」将订阅内容直接粘贴，或使用「上传文件」导入本地配置文件。
              </p>
            )}
          </div>
        )}

        <Button onClick={handleConvert} disabled={loading} className="w-full sm:w-auto">
          {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Link2 className="mr-1.5 h-3.5 w-3.5" />}
          开始转换
        </Button>
      </Card>

      {/* 结果区域 */}
      {(result || apiUrl) && (
        <Card className="border-2 p-4 space-y-4">
          {/* 输出方式 Tab */}
          <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
            {OUTPUT_TABS.map((tab) => {
              const disabled = tab.id === "link" && inputMode !== "url";
              return (
                <button
                  key={tab.id}
                  onClick={() => !disabled && setOutputMode(tab.id)}
                  disabled={disabled}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                    disabled
                      ? "cursor-not-allowed text-muted-foreground/40"
                      : outputMode === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={disabled ? "仅订阅 URL 方式支持生成链接" : ""}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 链接输出 */}
          {outputMode === "link" && inputMode === "url" && apiUrl && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                转换链接（在客户端中粘贴此地址作为订阅）
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={apiUrl}
                  className="h-10 flex-1 rounded-md border bg-muted/20 px-3 text-xs font-mono outline-none"
                />
                <Button variant="outline" size="sm" onClick={() => copy(apiUrl)} className="shrink-0">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium text-foreground">使用方式：</span>
                  复制上方链接，在对应客户端的订阅设置中粘贴作为订阅地址即可，客户端会自动拉取最新配置。
                </p>
                <p>
                  <span className="font-medium text-foreground">支持协议：</span>
                  Trojan、VLESS、VMess、Shadowsocks
                </p>
              </div>
            </div>
          )}

          {/* 下载输出 */}
          {outputMode === "download" && result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  转换完成，共 {result.split("\n").length} 行
                </label>
                <Button size="sm" variant="outline" onClick={download}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  下载 .{targetOption.ext}
                </Button>
              </div>
              <div className="max-h-64 overflow-auto rounded-md border bg-muted/20 p-3">
                <pre className="whitespace-pre-wrap break-all text-xs font-mono text-muted-foreground">
                  {result.length > 2000 ? result.slice(0, 2000) + "\n..." : result}
                </pre>
              </div>
            </div>
          )}

          {/* 二维码输出 */}
          {outputMode === "qrcode" && (
            <div className="flex flex-col items-center gap-3">
              <label className="text-xs font-medium text-muted-foreground">
                {inputMode === "url" ? "扫码订阅（链接）" : "扫码导入（内容）"}
              </label>
              {qrDataUrl ? (
                <div className="rounded-lg border bg-white p-3">
                  <img src={qrDataUrl} alt="QR Code" className="h-[200px] w-[200px]" />
                </div>
              ) : (
                <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border bg-muted/20 text-xs text-muted-foreground">
                  生成中...
                </div>
              )}
              <p className="text-center text-xs text-muted-foreground">
                使用手机客户端扫描二维码即可导入配置
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
