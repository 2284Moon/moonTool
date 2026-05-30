"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";

type Mode = "formatted" | "compressed";

export function JsonFormatter() {
    const [input, setInput] = useState("");
    const [mode, setMode] = useState<Mode>("formatted");
    const [error, setError] = useState("");
    const inputScrollRef = useRef<HTMLDivElement>(null);
    const outputScrollRef = useRef<HTMLDivElement>(null);

    // 解析后的 JSON 对象
    const [parsed, setParsed] = useState<unknown>(null);

    // 根据模式计算输出内容
    const output = useMemo(() => {
        if (parsed === null) return "";
        return mode === "formatted"
            ? JSON.stringify(parsed, null, 2)
            : JSON.stringify(parsed);
    }, [parsed, mode]);

    const inputLines = input.split("\n").length;
    const outputLines = output.split("\n").length;

    useEffect(() => {
        if (!input.trim()) {
            setParsed(null);
            setError("");
            return;
        }

        try {
            const result = JSON.parse(input);
            setParsed(result);
            setError("");
        } catch (e) {
            setParsed(null);
            setError((e as Error).message);
        }
    }, [input]);

    const handleOutputChange = (value: string) => {
        if (!value.trim()) {
            setInput("");
            setParsed(null);
            setError("");
            return;
        }

        try {
            const result = JSON.parse(value);
            setParsed(result);
            setInput(JSON.stringify(result));
            setError("");
        } catch (e) {
            setError((e as Error).message);
        }
    };

    const syncScroll = (source: HTMLDivElement, target: React.RefObject<HTMLDivElement | null>) => {
        if (target.current) {
            target.current.scrollTop = source.scrollTop;
        }
    };

    return (
        <div className="w-full space-y-4">
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                    <strong>错误：</strong> {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* 左侧：输入区域 */}
                <Card className="flex flex-col min-h-[500px] overflow-hidden border-2 border-dashed border-primary/30 bg-card py-0 transition-colors hover:border-primary/50">
                    <div className="border-b bg-muted/50 px-4 py-2">
                        <h2 className="text-sm font-semibold text-foreground">
                            📝 粘贴 JSON
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            在此粘贴或输入 JSON 字符串
                        </p>
                    </div>
                    <div className="relative flex flex-1 min-h-0 overflow-hidden">
                        {/* 行号 */}
                        <div
                            ref={inputScrollRef}
                            className="select-none overflow-hidden border-r bg-muted/30 py-3 text-right shrink-0"
                        >
                            {Array.from({ length: Math.max(inputLines, 1) }, (_, i) => (
                                <div
                                    key={i}
                                    className="px-2 font-mono text-xs leading-relaxed text-muted-foreground/60"
                                >
                                    {i + 1}
                                </div>
                            ))}
                        </div>
                        {/* 文本区域 */}
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onScroll={(e) => {
                                if (inputScrollRef.current) {
                                    inputScrollRef.current.scrollTop = e.currentTarget.scrollTop;
                                }
                            }}
                            placeholder='{"name": "moonTool", "type": "formatter"}'
                            className="h-full flex-1 resize-none overflow-auto bg-transparent px-3 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                            spellCheck={false}
                        />
                    </div>
                </Card>

                {/* 右侧：输出区域 */}
                <Card className="flex flex-col min-h-[500px] overflow-hidden border-2 border-dashed border-green-500/30 bg-card py-0 transition-colors hover:border-green-500/50">
                    <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">
                                ✨ 输出结果
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                可手动编辑，自动同步到左侧
                            </p>
                        </div>
                        {/* 模式切换 */}
                        <div className="flex rounded-md border bg-background">
                            <button
                                onClick={() => setMode("formatted")}
                                className={`px-3 py-1 text-xs font-medium transition-colors ${
                                    mode === "formatted"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                格式化
                            </button>
                            <button
                                onClick={() => setMode("compressed")}
                                className={`px-3 py-1 text-xs font-medium transition-colors ${
                                    mode === "compressed"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                压缩
                            </button>
                        </div>
                    </div>
                    <div className="relative flex flex-1 min-h-0 overflow-hidden">
                        {/* 行号 */}
                        <div
                            ref={outputScrollRef}
                            className="select-none overflow-hidden border-r bg-muted/30 py-3 text-right shrink-0"
                        >
                            {Array.from({ length: Math.max(outputLines, 1) }, (_, i) => (
                                <div
                                    key={i}
                                    className="px-2 font-mono text-xs leading-relaxed text-muted-foreground/60"
                                >
                                    {i + 1}
                                </div>
                            ))}
                        </div>
                        {/* 文本区域 */}
                        <textarea
                            value={output}
                            onChange={(e) => handleOutputChange(e.target.value)}
                            onScroll={(e) => {
                                if (outputScrollRef.current) {
                                    outputScrollRef.current.scrollTop = e.currentTarget.scrollTop;
                                }
                            }}
                            placeholder="输出结果将显示在这里..."
                            className="h-full flex-1 resize-none overflow-auto bg-transparent px-3 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                            spellCheck={false}
                        />
                    </div>
                </Card>
            </div>
        </div>
    );
}
