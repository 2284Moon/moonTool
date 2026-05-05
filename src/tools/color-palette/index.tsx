"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Plus, Trash2, Shuffle } from "lucide-react";

interface Color {
    id: string;
    hex: string;
    rgb: { r: number; g: number; b: number };
    hsl: { h: number; s: number; l: number };
}

export function ColorPalette() {
    const [currentColor, setCurrentColor] = useState("#3b82f6");
    const [palette, setPalette] = useState<Color[]>([]);

    // 将HEX转换为RGB
    const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
            }
            : { r: 0, g: 0, b: 0 };
    };

    // 将RGB转换为HSL
    const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0,
            s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / d + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / d + 4) / 6;
                    break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100),
        };
    };

    // 将HSL转换为HEX
    const hslToHex = (h: number, s: number, l: number): string => {
        h /= 360;
        s /= 100;
        l /= 100;
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p: number, q: number, t: number) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        const toHex = (x: number) => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    // 创建颜色对象
    const createColor = (hex: string): Color => {
        const rgb = hexToRgb(hex);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        return {
            id: Date.now().toString() + Math.random(),
            hex,
            rgb,
            hsl,
        };
    };

    // 添加颜色到调色板
    const addToPalette = () => {
        if (palette.length >= 10) return;
        setPalette([...palette, createColor(currentColor)]);
    };

    // 从调色板移除颜色
    const removeFromPalette = (id: string) => {
        setPalette(palette.filter((c) => c.id !== id));
    };

    // 生成随机颜色
    const generateRandomColor = () => {
        const randomHex = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
        setCurrentColor(randomHex);
    };

    // 生成互补色
    const generateComplementary = () => {
        const rgb = hexToRgb(currentColor);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const complementaryHsl = { ...hsl, h: (hsl.h + 180) % 360 };
        const complementaryHex = hslToHex(complementaryHsl.h, complementaryHsl.s, complementaryHsl.l);
        setPalette([createColor(currentColor), createColor(complementaryHex)]);
    };

    // 生成类似色
    const generateAnalogous = () => {
        const rgb = hexToRgb(currentColor);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const colors = [
            createColor(currentColor),
            createColor(hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l)),
            createColor(hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l)),
        ];
        setPalette(colors);
    };

    // 生成三色组
    const generateTriadic = () => {
        const rgb = hexToRgb(currentColor);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const colors = [
            createColor(currentColor),
            createColor(hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l)),
            createColor(hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l)),
        ];
        setPalette(colors);
    };

    // 复制到剪贴板
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) {
            console.error("复制失败", e);
        }
    };

    // 格式化RGB
    const formatRgb = (rgb: { r: number; g: number; b: number }) => {
        return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    };

    // 格式化HSL
    const formatHsl = (hsl: { h: number; s: number; l: number }) => {
        return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    };

    const currentColorObj = createColor(currentColor);

    return (
        <div className="w-full space-y-6">
            {/* 主颜色选择器 */}
            <Card className="overflow-hidden border-2 py-0">
                <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
                    {/* 左侧：颜色预览 */}
                    <div className="flex flex-col">
                        <div className="border-b bg-muted/50 px-4 py-2">
                            <h3 className="text-sm font-semibold text-foreground">🎨 当前颜色</h3>
                            <p className="text-xs text-muted-foreground">选择或输入颜色值</p>
                        </div>
                        <div className="flex flex-1 items-center justify-center p-8">
                            <div
                                className="h-48 w-48 rounded-2xl shadow-2xl ring-4 ring-border/20 transition-all hover:scale-105"
                                style={{ backgroundColor: currentColor }}
                            />
                        </div>
                    </div>

                    {/* 右侧：颜色控制 */}
                    <div className="flex flex-col border-l">
                        <div className="border-b bg-muted/50 px-4 py-2">
                            <h3 className="text-sm font-semibold text-foreground">⚙️ 颜色调整</h3>
                            <p className="text-xs text-muted-foreground">使用拾色器或输入颜色值</p>
                        </div>
                        <div className="flex flex-1 flex-col gap-4 p-4">
                            {/* 颜色选择器 */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) => setCurrentColor(e.target.value)}
                                    className="h-12 w-12 cursor-pointer rounded-lg border-2 border-border"
                                />
                                <Input
                                    value={currentColor}
                                    onChange={(e) => setCurrentColor(e.target.value)}
                                    placeholder="#000000"
                                    className="flex-1 font-mono"
                                />
                                <Button size="sm" variant="outline" onClick={generateRandomColor}>
                                    <Shuffle className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* 快速配色方案 */}
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">快速配色方案</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <Button size="sm" variant="outline" onClick={generateComplementary}>
                                        互补色
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={generateAnalogous}>
                                        类似色
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={generateTriadic}>
                                        三色组
                                    </Button>
                                </div>
                            </div>

                            {/* 添加到调色板 */}
                            <Button onClick={addToPalette} disabled={palette.length >= 10} className="w-full">
                                <Plus className="h-4 w-4" />
                                添加到调色板 ({palette.length}/10)
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* 颜色值格式 */}
            <Card className="overflow-hidden border-2 py-0">
                <div className="border-b bg-muted/50 px-4 py-2">
                    <h3 className="text-sm font-semibold text-foreground">📋 颜色值</h3>
                    <p className="text-xs text-muted-foreground">点击复制对应格式</p>
                </div>
                <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* HEX */}
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground">HEX</p>
                            <p className="font-mono text-sm font-semibold">{currentColorObj.hex.toUpperCase()}</p>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => copyToClipboard(currentColorObj.hex.toUpperCase())}
                        >
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {/* RGB */}
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground">RGB</p>
                            <p className="font-mono text-sm font-semibold">{formatRgb(currentColorObj.rgb)}</p>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => copyToClipboard(formatRgb(currentColorObj.rgb))}
                        >
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {/* HSL */}
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground">HSL</p>
                            <p className="font-mono text-sm font-semibold">{formatHsl(currentColorObj.hsl)}</p>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => copyToClipboard(formatHsl(currentColorObj.hsl))}
                        >
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {/* CSS Variable */}
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground">CSS Var</p>
                            <p className="truncate font-mono text-sm font-semibold">
                                --color: {currentColorObj.hex}
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => copyToClipboard(`--color: ${currentColorObj.hex};`)}
                        >
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* 调色板 */}
            <Card className="overflow-hidden border-2 py-0">
                <div className="border-b bg-muted/50 px-4 py-2">
                    <h3 className="text-sm font-semibold text-foreground">🎭 我的调色板</h3>
                    <p className="text-xs text-muted-foreground">保存和管理你的配色方案</p>
                </div>
                <div className="p-4">
                    {palette.length === 0 ? (
                        <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed">
                            <p className="text-sm text-muted-foreground">暂无颜色，点击上方"添加到调色板"开始</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                            {palette.map((color) => (
                                <div
                                    key={color.id}
                                    className="group relative overflow-hidden rounded-lg border-2 transition-all hover:scale-105 hover:shadow-lg"
                                >
                                    <div
                                        className="h-24 w-full cursor-pointer"
                                        style={{ backgroundColor: color.hex }}
                                        onClick={() => setCurrentColor(color.hex)}
                                    />
                                    <div className="flex items-center justify-between bg-background p-2">
                                        <span className="font-mono text-xs font-semibold">{color.hex.toUpperCase()}</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                                            onClick={() => removeFromPalette(color.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
