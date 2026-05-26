"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Download, ImageDown, Sparkles } from "lucide-react";

const sampleSvg = `<svg width="240" height="160" viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg">
  <!-- demo -->
  <metadata>moonTool demo</metadata>
  <rect width="240" height="160" rx="16" fill="#2563eb"/>
  <circle cx="170" cy="72" r="42" fill="#f97316" opacity="0.9"/>
  <text x="28" y="92" fill="white" font-size="28" font-family="Arial">SVG</text>
</svg>`;

const optimizeSvg = (svg: string) =>
  svg
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*(=)\s*/g, "$1")
    .trim();

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export function SvgCompressor() {
  const [input, setInput] = useState(sampleSvg);
  const output = useMemo(() => optimizeSvg(input), [input]);
  const base64 = useMemo(() => `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(output)))}`, [output]);
  const ratio = input.length ? Math.round((1 - output.length / input.length) * 100) : 0;

  const exportPng = () => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || 800;
      canvas.height = image.naturalHeight || 600;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      canvas.toBlob((blob) => blob && downloadBlob(blob, "optimized-svg.png"), "image/png");
    };
    image.src = base64;
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden border-2 py-0">
        <div className="border-b bg-muted/50 px-4 py-2">
          <h2 className="text-sm font-semibold">SVG 源码</h2>
          <p className="text-xs text-muted-foreground">粘贴 SVG，自动清理冗余代码</p>
        </div>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} className="h-[520px] w-full resize-none bg-transparent p-4 font-mono text-sm outline-none" />
      </Card>

      <div className="space-y-4">
        <Card className="overflow-hidden border-2 py-0">
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
            <div>
              <h2 className="text-sm font-semibold">优化结果</h2>
              <p className="text-xs text-muted-foreground">{input.length} → {output.length} 字符，约 {ratio}%</p>
            </div>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <textarea value={output} readOnly className="h-56 w-full resize-none bg-muted/20 p-4 font-mono text-sm outline-none" />
          <div className="flex flex-wrap gap-2 border-t p-4">
            <Button size="sm" onClick={() => navigator.clipboard.writeText(output)}><Copy className="mr-1 h-3.5 w-3.5" /> 复制 SVG</Button>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(base64)}><Copy className="mr-1 h-3.5 w-3.5" /> 复制 Base64</Button>
            <Button size="sm" variant="outline" onClick={() => downloadBlob(new Blob([output], { type: "image/svg+xml" }), "optimized.svg")}><Download className="mr-1 h-3.5 w-3.5" /> 下载 SVG</Button>
            <Button size="sm" variant="outline" onClick={exportPng}><ImageDown className="mr-1 h-3.5 w-3.5" /> 转 PNG</Button>
          </div>
        </Card>

        <Card className="overflow-hidden border-2 py-0">
          <div className="border-b bg-muted/50 px-4 py-2">
            <h2 className="text-sm font-semibold">预览</h2>
          </div>
          <div className="flex min-h-64 items-center justify-center bg-checkerboard p-4">
            {output ? <img src={base64} alt="svg preview" className="max-h-60 max-w-full" /> : <p className="text-sm text-muted-foreground">暂无 SVG</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
