"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Copy } from "lucide-react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

type CodeType = "QR" | "CODE128" | "EAN13" | "EAN8" | "UPC" | "CODE39" | "ITF14";

export function CodeGenerator() {
    const [input, setInput] = useState("");
    const [codeType, setCodeType] = useState<CodeType>("QR");
    const [error, setError] = useState("");
    const [qrSize, setQrSize] = useState(300);
    const [qrColor, setQrColor] = useState("#000000");
    const [qrBgColor, setQrBgColor] = useState("#ffffff");

    const qrCanvasRef = useRef<HTMLCanvasElement>(null);
    const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);

    const isQRCode = codeType === "QR";

    // 生成二维码
    useEffect(() => {
        if (!input.trim() || !isQRCode) return;

        const canvas = qrCanvasRef.current;
        if (!canvas) return;

        QRCode.toCanvas(
            canvas,
            input,
            {
                width: qrSize,
                margin: 2,
                color: {
                    dark: qrColor,
                    light: qrBgColor,
                },
            },
            (err) => {
                if (err) {
                    setError("二维码生成失败：" + err.message);
                } else {
                    setError("");
                }
            }
        );
    }, [input, isQRCode, qrSize, qrColor, qrBgColor]);

    // 生成条形码
    useEffect(() => {
        if (!input.trim() || isQRCode) return;

        const canvas = barcodeCanvasRef.current;
        if (!canvas) return;

        try {
            // 验证输入格式
            const validationResult = validateBarcodeInput(input, codeType);
            if (!validationResult.valid) {
                setError(validationResult.error || "输入格式不正确");
                return;
            }

            JsBarcode(canvas, input, {
                format: codeType,
                width: 2,
                height: 100,
                displayValue: true,
                fontSize: 14,
                margin: 10,
            });
            setError("");
        } catch (err) {
            const errorMsg = (err as Error).message || "条形码生成失败";
            setError("条形码生成失败：" + errorMsg);
        }
    }, [input, codeType, isQRCode]);

    // 验证条形码输入
    const validateBarcodeInput = (value: string, type: CodeType): { valid: boolean; error?: string } => {
        if (!value) return { valid: false, error: "请输入内容" };

        switch (type) {
            case "EAN13":
                if (!/^\d{13}$/.test(value)) {
                    return { valid: false, error: "EAN-13 必须是13位数字" };
                }
                break;
            case "EAN8":
                if (!/^\d{8}$/.test(value)) {
                    return { valid: false, error: "EAN-8 必须是8位数字" };
                }
                break;
            case "UPC":
                if (!/^\d{12}$/.test(value)) {
                    return { valid: false, error: "UPC 必须是12位数字" };
                }
                break;
            case "ITF14":
                if (!/^\d{14}$/.test(value)) {
                    return { valid: false, error: "ITF-14 必须是14位数字" };
                }
                break;
            case "CODE39":
                if (!/^[A-Z0-9\-. $/+%]+$/.test(value)) {
                    return { valid: false, error: "CODE 39 只支持大写字母、数字和特殊符号（-. $/+%）" };
                }
                break;
            case "CODE128":
                // CODE128 支持所有ASCII字符
                if (value.length === 0) {
                    return { valid: false, error: "请输入内容" };
                }
                break;
        }

        return { valid: true };
    };

    // 下载图片
    const handleDownload = () => {
        const canvas = isQRCode ? qrCanvasRef.current : barcodeCanvasRef.current;
        if (!canvas) return;

        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${codeType}-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    };

    // 复制图片
    const handleCopyImage = async () => {
        const canvas = isQRCode ? qrCanvasRef.current : barcodeCanvasRef.current;
        if (!canvas) return;

        try {
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                await navigator.clipboard.write([
                    new ClipboardItem({ "image/png": blob }),
                ]);
            });
        } catch (err) {
            setError("复制失败：" + (err as Error).message);
        }
    };

    const codeTypes: { value: CodeType; label: string; desc: string; example: string }[] = [
        { value: "QR", label: "二维码", desc: "QR Code", example: "支持任意文本" },
        { value: "CODE128", label: "CODE 128", desc: "通用条形码", example: "Hello123" },
        { value: "EAN13", label: "EAN-13", desc: "商品条形码", example: "1234567890128" },
        { value: "EAN8", label: "EAN-8", desc: "短商品码", example: "12345670" },
        { value: "UPC", label: "UPC", desc: "美国商品码", example: "123456789012" },
        { value: "CODE39", label: "CODE 39", desc: "工业条形码", example: "CODE39" },
        { value: "ITF14", label: "ITF-14", desc: "物流条形码", example: "12345678901231" },
    ];

    return (
        <div className="w-full space-y-4">
            {/* 码类型选择 */}
            <Card className="overflow-hidden border-2 py-0">
                <div className="border-b bg-muted/50 px-4 py-2">
                    <h3 className="text-sm font-semibold text-foreground">📱 码类型</h3>
                    <p className="text-xs text-muted-foreground">选择要生成的码类型</p>
                </div>
                <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-4 lg:grid-cols-7">
                    {codeTypes.map((type) => (
                        <button
                            key={type.value}
                            onClick={() => {
                                setCodeType(type.value);
                                setError("");
                            }}
                            className={`flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all hover:border-primary/50 ${codeType === type.value
                                ? "border-primary bg-primary/5"
                                : "border-border bg-background"
                                }`}
                        >
                            <span className="text-sm font-semibold">{type.label}</span>
                            <span className="text-xs text-muted-foreground">{type.desc}</span>
                        </button>
                    ))}
                </div>
            </Card>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                    <strong>错误：</strong> {error}
                </div>
            )}

            {/* 输入区域 */}
            <Card className="overflow-hidden border-2 py-0">
                <div className="border-b bg-muted/50 px-4 py-2">
                    <h3 className="text-sm font-semibold text-foreground">✏️ 输入内容</h3>
                    <p className="text-xs text-muted-foreground">
                        {codeTypes.find((t) => t.value === codeType)?.example && (
                            <>示例：{codeTypes.find((t) => t.value === codeType)?.example}</>
                        )}
                    </p>
                </div>
                <div className="p-4">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={`输入要生成${isQRCode ? "二维码" : "条形码"}的内容...`}
                        className="font-mono"
                    />
                </div>
            </Card>

            {/* 二维码设置 */}
            {isQRCode && (
                <Card className="overflow-hidden border-2 py-0">
                    <div className="border-b bg-muted/50 px-4 py-2">
                        <h3 className="text-sm font-semibold text-foreground">⚙️ 二维码设置</h3>
                        <p className="text-xs text-muted-foreground">自定义二维码样式</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                尺寸：{qrSize}px
                            </label>
                            <input
                                type="range"
                                min="200"
                                max="600"
                                step="50"
                                value={qrSize}
                                onChange={(e) => setQrSize(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">前景色</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={qrColor}
                                    onChange={(e) => setQrColor(e.target.value)}
                                    className="h-10 w-16 cursor-pointer rounded border-2"
                                />
                                <Input
                                    value={qrColor}
                                    onChange={(e) => setQrColor(e.target.value)}
                                    className="flex-1 font-mono text-xs"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">背景色</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={qrBgColor}
                                    onChange={(e) => setQrBgColor(e.target.value)}
                                    className="h-10 w-16 cursor-pointer rounded border-2"
                                />
                                <Input
                                    value={qrBgColor}
                                    onChange={(e) => setQrBgColor(e.target.value)}
                                    className="flex-1 font-mono text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* 预览区域 */}
            <Card className="overflow-hidden border-2 py-0">
                <div className="border-b bg-muted/50 px-4 py-2">
                    <h3 className="text-sm font-semibold text-foreground">👁️ 预览</h3>
                    <p className="text-xs text-muted-foreground">
                        {isQRCode ? "二维码" : "条形码"}预览
                    </p>
                </div>
                <div className="flex min-h-[400px] items-center justify-center p-8">
                    {!input.trim() ? (
                        <p className="text-sm text-muted-foreground">请输入内容以生成{isQRCode ? "二维码" : "条形码"}</p>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            {isQRCode ? (
                                <canvas
                                    ref={qrCanvasRef}
                                    className="rounded-lg border-2 shadow-lg"
                                    style={{ backgroundColor: qrBgColor }}
                                />
                            ) : (
                                <canvas
                                    ref={barcodeCanvasRef}
                                    className="rounded-lg border-2 bg-white shadow-lg"
                                />
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {/* 操作按钮 */}
            {input.trim() && (
                <div className="flex items-center justify-center gap-3">
                    <Button onClick={handleDownload} size="lg">
                        <Download className="h-4 w-4" />
                        下载图片
                    </Button>
                    <Button onClick={handleCopyImage} size="lg" variant="outline">
                        <Copy className="h-4 w-4" />
                        复制图片
                    </Button>
                </div>
            )}

            {/* 使用说明 */}
            <Card className="overflow-hidden border py-0">
                <div className="border-b bg-muted/50 px-4 py-2">
                    <h3 className="text-sm font-semibold text-foreground">💡 使用说明</h3>
                </div>
                <div className="space-y-2 p-4 text-xs text-muted-foreground">
                    <p>
                        <strong>二维码（QR Code）：</strong>
                        可以存储任意文本、网址、联系方式等，支持自定义颜色和尺寸
                    </p>
                    <p>
                        <strong>CODE 128：</strong>
                        通用条形码，支持数字、字母和特殊字符
                    </p>
                    <p>
                        <strong>EAN-13：</strong>
                        国际商品条形码，必须是13位数字（最后一位是校验码）
                    </p>
                    <p>
                        <strong>EAN-8：</strong>
                        短版商品条形码，必须是8位数字
                    </p>
                    <p>
                        <strong>UPC：</strong>
                        美国通用商品代码，必须是12位数字
                    </p>
                    <p>
                        <strong>CODE 39：</strong>
                        工业用条形码，支持大写字母、数字和部分符号
                    </p>
                    <p>
                        <strong>ITF-14：</strong>
                        物流包装条形码，必须是14位数字
                    </p>
                </div>
            </Card>
        </div>
    );
}
