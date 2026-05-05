"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";

export function JsonFormatter() {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");
    const inputScrollRef = useRef<HTMLDivElement>(null);
    const outputScrollRef = useRef<HTMLDivElement>(null);

    const inputLines = input.split("\n").length;
    const outputLines = output.split("\n").length;

    useEffect(() => {
        if (!input.trim()) {
            setOutput("");
            setError("");
            return;
        }

        try {
            const parsed = JSON.parse(input);
            setOutput(JSON.stringify(parsed, null, 2));
            setError("");
        } catch (e) {
            setError((e as Error).message);
        }
    }, [input]);

    const handleOutputChange = (value: string) => {
        setOutput(value);
        if (!value.trim()) {
            setInput("");
            setError("");
            return;
        }

        try {
            const parsed = JSON.parse(value);
            setInput(JSON.stringify(parsed));
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
                <Card className="flex flex-col overflow-hidden border-2 border-dashed border-primary/30 bg-card py-0 transition-colors hover:border-primary/50">
                    <div className="border-b bg-muted/50 px-4 py-2">
                        <h2 className="text-sm font-semibold text-foreground">
                            📝 粘贴 JSON
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            在此粘贴或输入 JSON 字符串
                        </p>
                    </div>
                    <div className="relative flex flex-1 overflow-hidden">
                        {/* 行号 */}
                        <div
                            ref={inputScrollRef}
                            className="select-none overflow-hidden border-r bg-muted/30 py-3 text-right"
                            onScroll={(e) => syncScroll(e.currentTarget, outputScrollRef)}
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
                            className="h-[500px] flex-1 resize-none bg-transparent px-3 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                            spellCheck={false}
                        />
                    </div>
                </Card>

                {/* 右侧：格式化输出区域 */}
                <Card className="flex flex-col overflow-hidden border-2 border-dashed border-green-500/30 bg-card py-0 transition-colors hover:border-green-500/50">
                    <div className="border-b bg-muted/50 px-4 py-2">
                        <h2 className="text-sm font-semibold text-foreground">
                            ✨ 格式化结果
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            自动格式化，也可手动编辑
                        </p>
                    </div>
                    <div className="relative flex flex-1 overflow-hidden">
                        {/* 行号 */}
                        <div
                            ref={outputScrollRef}
                            className="select-none overflow-hidden border-r bg-muted/30 py-3 text-right"
                            onScroll={(e) => syncScroll(e.currentTarget, inputScrollRef)}
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
                            placeholder="格式化后的 JSON 将显示在这里..."
                            className="h-[500px] flex-1 resize-none bg-transparent px-3 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                            spellCheck={false}
                        />
                    </div>
                </Card>
            </div>
        </div>
    );
}
