"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Download, RefreshCw } from "lucide-react";

const en = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua".split(" ");
const zh = "设计 开发 产品 用户 体验 页面 数据 内容 模块 组件 状态 交互 布局 视觉 品牌 系统 工具 平台 效率 流程".split(" ");

const pick = (words: string[], count: number) => Array.from({ length: count }, () => words[Math.floor(Math.random() * words.length)]);

const sentence = (lang: "zh" | "en", min = 8, max = 18) => {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  if (lang === "zh") return pick(zh, count).join("") + "。";
  const words = pick(en, count);
  return words[0][0].toUpperCase() + words[0].slice(1) + " " + words.slice(1).join(" ") + ".";
};

export function LoremIpsum() {
  const [lang, setLang] = useState<"zh" | "en">("zh");
  const [mode, setMode] = useState<"words" | "sentences" | "paragraphs">("paragraphs");
  const [count, setCount] = useState(4);
  const [seed, setSeed] = useState(0);

  const output = useMemo(() => {
    if (mode === "words") return pick(lang === "zh" ? zh : en, count).join(lang === "zh" ? "" : " ");
    if (mode === "sentences") return Array.from({ length: count }, () => sentence(lang)).join(lang === "zh" ? "" : " ");
    return Array.from({ length: count }, () => Array.from({ length: 4 }, () => sentence(lang)).join(lang === "zh" ? "" : " ")).join("\n\n");
  }, [count, lang, mode, seed]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([output], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "placeholder-text.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <Card className="space-y-4 border-2 p-4">
        <div>
          <h2 className="text-sm font-semibold">生成设置</h2>
          <p className="text-xs text-muted-foreground">快速生成排版、原型、开发用占位文本</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={lang === "zh" ? "secondary" : "outline"} onClick={() => setLang("zh")}>中文</Button>
          <Button variant={lang === "en" ? "secondary" : "outline"} onClick={() => setLang("en")}>English</Button>
        </div>
        <div className="grid gap-2">
          {[
            ["words", "词组"],
            ["sentences", "句子"],
            ["paragraphs", "段落"],
          ].map(([value, label]) => (
            <Button key={value} variant={mode === value ? "secondary" : "outline"} onClick={() => setMode(value as typeof mode)}>{label}</Button>
          ))}
        </div>
        <div>
          <label className="flex justify-between text-xs text-muted-foreground"><span>数量</span><span>{count}</span></label>
          <input type="range" min={1} max={mode === "words" ? 200 : 20} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-primary" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setSeed((v) => v + 1)}><RefreshCw className="mr-1 h-3.5 w-3.5" /> 重新生成</Button>
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(output)}><Copy className="mr-1 h-3.5 w-3.5" /> 复制</Button>
          <Button size="sm" variant="outline" onClick={download}><Download className="mr-1 h-3.5 w-3.5" /> 下载</Button>
        </div>
      </Card>

      <Card className="overflow-hidden border-2 py-0">
        <div className="border-b bg-muted/50 px-4 py-2">
          <h2 className="text-sm font-semibold">占位文本</h2>
          <p className="text-xs text-muted-foreground">可直接复制到设计稿或代码中</p>
        </div>
        <textarea value={output} readOnly className="min-h-[560px] w-full resize-none bg-transparent p-4 text-sm leading-7 outline-none" />
      </Card>
    </div>
  );
}
