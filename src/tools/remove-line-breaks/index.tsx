"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, X, Eraser, Replace, Minus } from "lucide-react";

export function RemoveLineBreaks() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"remove" | "removeBlankLines" | "replace">(
    "remove"
  );
  const [replacement, setReplacement] = useState("");

  const output = useMemo(() => {
    if (!input) return "";
    if (mode === "remove") {
      return input.replace(/[\r\n]+/g, "");
    }
    if (mode === "removeBlankLines") {
      return input
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "")
        .join("\n");
    }
    return input.replace(/[\r\n]+/g, replacement);
  }, [input, mode, replacement]);

  const inputLineCount = input ? input.split("\n").length : 0;
  const outputLineCount = output ? output.split("\n").length : 0;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    setInput("");
    setReplacement("");
  };

  return (
    <div className="w-full space-y-4">
      {/* Mode Selection */}
      <Card className="flex flex-wrap items-center gap-3 border-0 bg-muted/30 p-3 shadow-none">
        <div className="flex items-center gap-1.5 rounded-lg bg-background p-1 shadow-sm">
          <Button
            variant={mode === "remove" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={() => setMode("remove")}
          >
            <Eraser className="h-3.5 w-3.5" />
            删除换行
          </Button>
          <Button
            variant={mode === "removeBlankLines" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={() => setMode("removeBlankLines")}
          >
            <Minus className="h-3.5 w-3.5" />
            删除空行
          </Button>
          <Button
            variant={mode === "replace" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={() => setMode("replace")}
          >
            <Replace className="h-3.5 w-3.5" />
            换行符替换
          </Button>
        </div>
        {mode === "replace" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">替换为：</span>
            <Input
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder="输入替换字符..."
              className="h-8 w-36 text-xs"
            />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: Input */}
        <Card className="flex flex-col overflow-hidden border bg-card py-0 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                📝 原始文本
              </h2>
              <p className="text-xs text-muted-foreground">
                粘贴或输入需要处理的文本
              </p>
            </div>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {inputLineCount} 行
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="在此粘贴文本..."
            className="h-[400px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            spellCheck={false}
          />
        </Card>

        {/* Right: Output */}
        <Card className="flex flex-col overflow-hidden border bg-card py-0 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                ✨ 处理结果
              </h2>
              <p className="text-xs text-muted-foreground">
                {mode === "remove"
                  ? "所有换行符已被删除"
                  : mode === "removeBlankLines"
                    ? "空行已被删除，原有文本换行保留"
                  : `换行符已替换为"${replacement || "(空)"}"`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {outputLineCount} 行
              </span>
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
                disabled={!input && !output}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="处理后的文本将显示在这里..."
            className="h-[400px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            spellCheck={false}
          />
        </Card>
      </div>

      {/* Stats Bar */}
      {input && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-4 py-2 text-xs">
          <span className="text-muted-foreground">
            输入：<strong className="text-foreground">{input.length}</strong>{" "}
            字符 · <strong className="text-foreground">{inputLineCount}</strong>{" "}
            行
          </span>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-muted-foreground">
            输出：<strong className="text-foreground">{output.length}</strong>{" "}
            字符 ·{" "}
            <strong className="text-foreground">{outputLineCount}</strong> 行
          </span>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-green-600 dark:text-green-400">
            减少 {inputLineCount - outputLineCount} 行
          </span>
        </div>
      )}
    </div>
  );
}
