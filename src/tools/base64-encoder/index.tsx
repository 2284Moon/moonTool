"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight, Copy, Download, Upload, X, ScanSearch,
} from "lucide-react";

type EncodingType = "base64" | "url" | "url-component";

interface EncodingMode {
  id: EncodingType;
  label: string;
  description: string;
  encode: (text: string) => string;
  decode: (text: string) => string;
  inputLabel: string;
  inputIcon: string;
  outputLabel: string;
  outputIcon: string;
  inputPlaceholder: string;
  outputPlaceholder: string;
  hasFileMode?: boolean;
}

// Unicode-safe base64 (用 TextEncoder 替代 deprecated 的 escape/unescape)
function base64Encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64Decode(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

const encodingModes: EncodingMode[] = [
  {
    id: "base64",
    label: "Base64 编解码",
    description: "将文本与 Base64 编码互相转换，支持文件",
    encode: base64Encode,
    decode: base64Decode,
    inputLabel: "原始文本",
    inputIcon: "📝",
    outputLabel: "Base64 编码",
    outputIcon: "🔐",
    inputPlaceholder: "在此输入需要编码的文本...",
    outputPlaceholder: "编码结果，也可粘贴 Base64 进行解码...",
    hasFileMode: true,
  },
  {
    id: "url",
    label: "URL 编解码",
    description: "对完整 URL 编码与解码（保留 : / ? & = # 等结构字符）",
    encode: (text) => encodeURI(text),
    decode: (text) => decodeURI(text),
    inputLabel: "原始 URL / 文本",
    inputIcon: "📝",
    outputLabel: "URL 编码",
    outputIcon: "🔗",
    inputPlaceholder: "在此输入需要编码的 URL...",
    outputPlaceholder: "编码结果，也可粘贴进行解码...",
  },
  {
    id: "url-component",
    label: "URL 参数编解码",
    description: "对 URL 参数编码与解码（所有特殊字符都会被编码）",
    encode: (text) => encodeURIComponent(text),
    decode: (text) => decodeURIComponent(text),
    inputLabel: "原始参数 / 文本",
    inputIcon: "📝",
    outputLabel: "参数编码",
    outputIcon: "🔗",
    inputPlaceholder: "在此输入 URL 参数或待编码文本...",
    outputPlaceholder: "编码结果，也可粘贴进行解码...",
  },
];

/** 自动检测输入内容属于哪种编码格式 */
function detectEncodingType(text: string): EncodingType | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 4) return null;

  const hasPercentEncoding = /%[0-9A-Fa-f]{2}/.test(trimmed);

  if (hasPercentEncoding) {
    // URL 结构字符（encodeURI 不会编码这些，encodeURIComponent 会）
    const stripped = trimmed.replace(/%[0-9A-Fa-f]{2}/g, "");
    const hasUrlStructure = /[:\/?#\[\]@!$&'()*+,;=]/.test(stripped);
    return hasUrlStructure ? "url" : "url-component";
  }

  // Base64: 仅含 A-Za-z0-9+/=，且长度 ≥20 或含特殊字符 + / =
  const isBase64Chars = /^[A-Za-z0-9+/]*={0,2}$/.test(trimmed);
  const hasBase64Special = /[+/=]/.test(trimmed);
  if (isBase64Chars && (trimmed.length >= 20 || hasBase64Special)) {
    return "base64";
  }

  return null;
}

export function EncodingTools() {
  const [activeMode, setActiveMode] = useState<EncodingType>("base64");
  const [textInput, setTextInput] = useState("");
  const [output, setOutput] = useState("");
  const [fileMode, setFileMode] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [autoDetect, setAutoDetect] = useState(false);

  const currentMode = encodingModes.find((m) => m.id === activeMode)!;

  // ===== 左侧输入：编码 =====
  const handleInputChange = useCallback(
    (value: string) => {
      setTextInput(value);

      if (!value.trim()) {
        setOutput("");
        setError("");
        return;
      }

      // 自动检测模式
      if (autoDetect) {
        const detected = detectEncodingType(value);
        if (detected && detected !== activeMode) {
          setActiveMode(detected);
          const mode = encodingModes.find((m) => m.id === detected)!;
          try {
            const decoded = mode.decode(value.trim());
            setOutput(decoded);
            setError("");
          } catch {
            setOutput(value);
          }
          return;
        }
      }

      // 正常编码
      try {
        const encoded = currentMode.encode(value);
        setOutput(encoded);
        setError("");
      } catch (e) {
        setError(`编码失败：${(e as Error).message}`);
      }
    },
    [currentMode, autoDetect, activeMode]
  );

  // ===== 右侧输出：解码 =====
  const handleOutputChange = useCallback(
    (value: string) => {
      setOutput(value);

      if (!value.trim()) {
        setTextInput("");
        setError("");
        return;
      }

      // 自动检测模式
      if (autoDetect) {
        const detected = detectEncodingType(value);
        if (detected && detected !== activeMode) {
          setActiveMode(detected);
        }
      }

      try {
        const decoded = currentMode.decode(value);
        setTextInput(decoded);
        setError("");
      } catch (e) {
        setError(`解码失败：${(e as Error).message}`);
      }
    },
    [currentMode, autoDetect, activeMode]
  );

  // ===== 交换 =====
  const handleSwap = () => {
    if (!output) return;
    const oldOutput = output;
    try {
      const decoded = currentMode.decode(oldOutput);
      setTextInput(oldOutput);
      setOutput(decoded);
      setError("");
    } catch {
      setTextInput(oldOutput);
      setOutput(textInput);
    }
  };

  // ===== 复制 =====
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("复制失败");
    }
  };

  // ===== 清空 =====
  const handleClear = () => {
    setTextInput("");
    setOutput("");
    setFileName("");
    setError("");
  };

  // ===== 文件上传 (Base64) =====
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = (event.target?.result as string).split(",")[1];
        setOutput(result);
        setError("");
      } catch (err) {
        setError(`文件读取失败：${(err as Error).message}`);
      }
    };
    reader.onerror = () => setError("文件读取失败");
    reader.readAsDataURL(file);
  };

  // ===== 下载文件 (Base64) =====
  const handleDownload = () => {
    if (!output) return;
    try {
      const binary = atob(output);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "decoded-file";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`下载失败：${(err as Error).message}`);
    }
  };

  const isBase64 = activeMode === "base64";
  const showFileMode = isBase64 && fileMode;

  return (
    <div className="w-full space-y-4">
      {/* 编码类型 Tab */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {encodingModes.map((mode) => (
          <Button
            key={mode.id}
            variant={activeMode === mode.id ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveMode(mode.id);
              handleClear();
            }}
          >
            {mode.label}
          </Button>
        ))}
      </div>

      {/* 描述 */}
      <p className="text-center text-sm text-muted-foreground">
        {currentMode.description}
      </p>

      {/* 子模式 & 自动检测 */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {isBase64 && (
          <>
            <Button
              variant={!fileMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setFileMode(false);
                handleClear();
              }}
            >
              文本模式
            </Button>
            <Button
              variant={fileMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setFileMode(true);
                handleClear();
              }}
            >
              文件模式
            </Button>
          </>
        )}
        <Button
          variant={autoDetect ? "secondary" : "outline"}
          size="sm"
          onClick={() => setAutoDetect(!autoDetect)}
        >
          <ScanSearch className="mr-1 h-3.5 w-3.5" />
          {autoDetect ? "自动检测 ✓" : "自动检测"}
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <strong>错误：</strong> {error}
        </div>
      )}

      {showFileMode ? (
        // ===== 文件模式 =====
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="flex flex-col overflow-hidden border-2 border-dashed border-purple-500/30 bg-card py-0">
            <div className="border-b bg-muted/50 px-4 py-2">
              <h2 className="text-sm font-semibold">📁 上传文件</h2>
              <p className="text-xs text-muted-foreground">
                选择文件进行 Base64 编码
              </p>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-muted/50">
                <Upload className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <div className="text-center">
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
                >
                  选择文件
                </Button>
                {fileName && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    已选择: <span className="font-medium">{fileName}</span>
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground/70">
                支持任意文件类型
              </p>
            </div>
          </Card>

          <Card className="flex flex-col overflow-hidden border-2 border-dashed border-green-500/30 bg-card py-0">
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
              <div>
                <h2 className="text-sm font-semibold">🔐 Base64 结果</h2>
                <p className="text-xs text-muted-foreground">
                  编码结果，可复制或下载
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleCopy(output)}
                  disabled={!output}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleDownload}
                  disabled={!output}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleClear}
                  disabled={!output}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <textarea
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              placeholder="Base64 编码结果将显示在这里..."
              className="h-[400px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              spellCheck={false}
            />
          </Card>
        </div>
      ) : (
        // ===== 文本模式 =====
        <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 左侧：输入 */}
          <Card className="flex flex-col overflow-hidden border-2 border-dashed border-blue-500/30 bg-card py-0 transition-colors hover:border-blue-500/50">
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
              <div>
                <h2 className="text-sm font-semibold">
                  {currentMode.inputIcon} {currentMode.inputLabel}
                </h2>
                <p className="text-xs text-muted-foreground">
                  输入需要编码的文本
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleCopy(textInput)}
                disabled={!textInput}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <textarea
              value={textInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={currentMode.inputPlaceholder}
              className="h-[400px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              spellCheck={false}
            />
          </Card>

          {/* 交换按钮 */}
          <div className="flex items-center justify-center lg:absolute lg:left-1/2 lg:top-1/2 lg:z-10 lg:-translate-x-1/2 lg:-translate-y-1/2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 rounded-full p-0 shadow-lg"
              onClick={handleSwap}
              disabled={!textInput && !output}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          </div>

          {/* 右侧：输出 */}
          <Card className="flex flex-col overflow-hidden border-2 border-dashed border-green-500/30 bg-card py-0 transition-colors hover:border-green-500/50">
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
              <div>
                <h2 className="text-sm font-semibold">
                  {currentMode.outputIcon} {currentMode.outputLabel}
                </h2>
                <p className="text-xs text-muted-foreground">
                  自动编码，也可粘贴解码
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleCopy(output)}
                  disabled={!output}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleClear}
                  disabled={!textInput && !output}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <textarea
              value={output}
              onChange={(e) => handleOutputChange(e.target.value)}
              placeholder={currentMode.outputPlaceholder}
              className="h-[400px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              spellCheck={false}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
