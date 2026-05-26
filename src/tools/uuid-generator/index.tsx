"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Download, RefreshCw } from "lucide-react";

const makeUuid = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export function UuidGenerator() {
  const [count, setCount] = useState(20);
  const [upper, setUpper] = useState(false);
  const [hyphen, setHyphen] = useState(true);
  const [guid, setGuid] = useState(false);
  const [items, setItems] = useState<string[]>(() => Array.from({ length: 20 }, makeUuid));

  const output = useMemo(() => {
    return items
      .map((item) => {
        let value = hyphen ? item : item.replace(/-/g, "");
        value = upper ? value.toUpperCase() : value.toLowerCase();
        return guid ? `{${value}}` : value;
      })
      .join("\n");
  }, [guid, hyphen, items, upper]);

  const generate = () => setItems(Array.from({ length: Math.max(1, Math.min(1000, count)) }, makeUuid));
  const copy = () => navigator.clipboard.writeText(output);
  const download = () => {
    const url = URL.createObjectURL(new Blob([output], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "uuid-list.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-4">
      <Card className="grid gap-4 border-2 p-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">生成数量</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 font-mono text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="grid gap-2">
            {[
              ["大写输出", upper, setUpper],
              ["移除连字符", !hyphen, (v: boolean) => setHyphen(!v)],
              ["GUID 大括号", guid, setGuid],
            ].map(([label, checked, setter]) => (
              <label key={String(label)} className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
                <span>{String(label)}</span>
                <input type="checkbox" checked={Boolean(checked)} onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)} />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={generate}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> 生成
            </Button>
            <Button size="sm" variant="outline" onClick={copy}>
              <Copy className="mr-1 h-3.5 w-3.5" /> 复制
            </Button>
            <Button size="sm" variant="outline" onClick={download}>
              <Download className="mr-1 h-3.5 w-3.5" /> 下载
            </Button>
          </div>
        </div>
        <textarea
          value={output}
          readOnly
          className="min-h-[520px] resize-none rounded-md border bg-muted/20 p-4 font-mono text-sm leading-6 outline-none"
        />
      </Card>
    </div>
  );
}
