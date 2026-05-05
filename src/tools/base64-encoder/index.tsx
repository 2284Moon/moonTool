"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Copy, Download, Upload, X } from "lucide-react";

export function Base64Encoder() {
    const [mode, setMode] = useState<"text" | "file">("text");
    const [textInput, setTextInput] = useState("");
    const [base64Output, setBase64Output] = useState("");
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");

    // 文本编码
    useEffect(() => {
        if (mode === "text" && textInput) {
            try {
                const encoded = btoa(unescape(encodeURIComponent(textInput)));
                setBase64Output(encoded);
                setError("");
            } catch (e) {
                setError("编码失败：" + (e as Error).message);
            }
        } else if (mode === "text" && !textInput) {
            setBase64Output("");
        }
    }, [textInput, mode]);

    // 文本解码
    const handleBase64Decode = (value: string) => {
        setBase64Output(value);
        if (!value.trim()) {
            setTextInput("");
            setError("");
            return;
        }

        try {
            const decoded = decodeURIComponent(escape(atob(value)));
            setTextInput(decoded);
            setError("");
        } catch (e) {
            setError("解码失败：" + (e as Error).message);
        }
    };

    // 文件上传编码
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const base64 = (event.target?.result as string).split(",")[1];
                setBase64Output(base64);
                setError("");
            } catch (e) {
                setError("文件读取失败：" + (e as Error).message);
            }
        };

        reader.onerror = () => {
            setError("文件读取失败");
        };

        reader.readAsDataURL(file);
    };

    // 下载解码后的文件
    const handleDownloadDecoded = () => {
        if (!base64Output) return;

        try {
            const byteCharacters = atob(base64Output);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray]);

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName || "decoded-file";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            setError("下载失败：" + (e as Error).message);
        }
    };

    // 复制到剪贴板
    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) {
            setError("复制失败");
        }
    };

    // 清空
    const handleClear = () => {
        setTextInput("");
        setBase64Output("");
        setFileName("");
        setError("");
    };

    // 触发文件选择
    const handleFileSelect = () => {
        document.getElementById("file-upload")?.click();
    };

    // 交换内容
    const handleSwap = () => {
        if (mode === "text") {
            const temp = textInput;
            setTextInput(base64Output);
            handleBase64Decode(temp);
        }
    };

    return (
        <div className="w-full space-y-4">
            {/* 模式切换 */}
            <div className="flex items-center justify-center gap-2">
                <Button
                    variant={mode === "text" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                        setMode("text");
                        setFileName("");
                        setBase64Output("");
                        setError("");
                    }}
                >
                    文本模式
                </Button>
                <Button
                    variant={mode === "file" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                        setMode("file");
                        setTextInput("");
                        setError("");
                    }}
                >
                    文件模式
                </Button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                    <strong>错误：</strong> {error}
                </div>
            )}

            {mode === "text" ? (
                // 文本模式
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* 左侧：原始文本 */}
                    <Card className="flex flex-col overflow-hidden border-2 border-dashed border-blue-500/30 bg-card py-0 transition-colors hover:border-blue-500/50">
                        <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">
                                    📝 原始文本
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    输入需要编码的文本
                                </p>
                            </div>
                            <div className="flex gap-1">
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
                        </div>
                        <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="在此输入需要编码的文本..."
                            className="h-[400px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                            spellCheck={false}
                        />
                    </Card>

                    {/* 中间：交换按钮 */}
                    <div className="flex items-center justify-center lg:absolute lg:left-1/2 lg:top-1/2 lg:z-10 lg:-translate-x-1/2 lg:-translate-y-1/2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 w-10 rounded-full p-0 shadow-lg"
                            onClick={handleSwap}
                            disabled={!textInput && !base64Output}
                        >
                            <ArrowLeftRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* 右侧：Base64 编码 */}
                    <Card className="flex flex-col overflow-hidden border-2 border-dashed border-green-500/30 bg-card py-0 transition-colors hover:border-green-500/50">
                        <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">
                                    🔐 Base64 编码
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    自动编码，也可粘贴解码
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleCopy(base64Output)}
                                    disabled={!base64Output}
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={handleClear}
                                    disabled={!textInput && !base64Output}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                        <textarea
                            value={base64Output}
                            onChange={(e) => handleBase64Decode(e.target.value)}
                            placeholder="Base64 编码结果将显示在这里..."
                            className="h-[400px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                            spellCheck={false}
                        />
                    </Card>
                </div>
            ) : (
                // 文件模式
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* 左侧：文件上传 */}
                    <Card className="flex flex-col overflow-hidden border-2 border-dashed border-purple-500/30 bg-card py-0 transition-colors hover:border-purple-500/50">
                        <div className="border-b bg-muted/50 px-4 py-2">
                            <h3 className="text-sm font-semibold text-foreground">
                                📁 上传文件
                            </h3>
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
                                    onClick={handleFileSelect}
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

                    {/* 右侧：Base64 结果 */}
                    <Card className="flex flex-col overflow-hidden border-2 border-dashed border-green-500/30 bg-card py-0 transition-colors hover:border-green-500/50">
                        <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">
                                    🔐 Base64 结果
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    编码结果，可复制或下载
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleCopy(base64Output)}
                                    disabled={!base64Output}
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={handleDownloadDecoded}
                                    disabled={!base64Output}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={handleClear}
                                    disabled={!base64Output}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                        <textarea
                            value={base64Output}
                            onChange={(e) => setBase64Output(e.target.value)}
                            placeholder="Base64 编码结果将显示在这里..."
                            className="h-[400px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                            spellCheck={false}
                        />
                    </Card>
                </div>
            )}
        </div>
    );
}
