"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Plus, Trash2 } from "lucide-react";

interface Stop {
  id: string;
  color: string;
  pos: number;
}

export function CssGradient() {
  const [type, setType] = useState<"linear" | "radial">("linear");
  const [angle, setAngle] = useState(135);
  const [shape, setShape] = useState<"circle" | "ellipse">("circle");
  const [stops, setStops] = useState<Stop[]>([
    { id: "1", color: "#2563eb", pos: 0 },
    { id: "2", color: "#f97316", pos: 100 },
  ]);

  const sorted = useMemo(() => [...stops].sort((a, b) => a.pos - b.pos), [stops]);
  const css = useMemo(() => {
    const list = sorted.map((stop) => `${stop.color} ${stop.pos}%`).join(", ");
    return type === "linear" ? `linear-gradient(${angle}deg, ${list})` : `radial-gradient(${shape} at center, ${list})`;
  }, [angle, shape, sorted, type]);

  const update = (id: string, patch: Partial<Stop>) => setStops((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const addStop = () => setStops((items) => [...items, { id: crypto.randomUUID(), color: "#22c55e", pos: 50 }]);
  const removeStop = (id: string) => setStops((items) => items.length <= 2 ? items : items.filter((item) => item.id !== id));
  const cssBlock = `background: ${css};`;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Card className="overflow-hidden border-2 py-0">
        <div className="border-b bg-muted/50 px-4 py-2">
          <h2 className="text-sm font-semibold">渐变预览</h2>
          <p className="text-xs text-muted-foreground">调整色标位置，实时生成 CSS</p>
        </div>
        <div className="h-[520px] w-full" style={{ background: css }} />
        <div className="relative h-14 border-t bg-muted/30 px-4">
          {stops.map((stop) => (
            <input
              key={stop.id}
              type="range"
              min={0}
              max={100}
              value={stop.pos}
              onChange={(e) => update(stop.id, { pos: Number(e.target.value) })}
              className="absolute left-4 right-4 top-4 w-[calc(100%-2rem)] accent-primary"
              style={{ accentColor: stop.color }}
            />
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="space-y-4 border-2 p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button variant={type === "linear" ? "secondary" : "outline"} onClick={() => setType("linear")}>线性</Button>
            <Button variant={type === "radial" ? "secondary" : "outline"} onClick={() => setType("radial")}>径向</Button>
          </div>
          {type === "linear" ? (
            <div>
              <label className="flex justify-between text-xs text-muted-foreground"><span>角度</span><span>{angle}°</span></label>
              <input type="range" min={0} max={360} value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="w-full accent-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button variant={shape === "circle" ? "secondary" : "outline"} onClick={() => setShape("circle")}>Circle</Button>
              <Button variant={shape === "ellipse" ? "secondary" : "outline"} onClick={() => setShape("ellipse")}>Ellipse</Button>
            </div>
          )}
        </Card>

        <Card className="space-y-3 border-2 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">颜色节点</h3>
            <Button size="sm" variant="outline" onClick={addStop}><Plus className="mr-1 h-3.5 w-3.5" /> 添加</Button>
          </div>
          {stops.map((stop) => (
            <div key={stop.id} className="grid grid-cols-[44px_1fr_64px_32px] items-center gap-2">
              <input type="color" value={stop.color} onChange={(e) => update(stop.id, { color: e.target.value })} className="h-9 w-11 rounded border" />
              <input value={stop.color} onChange={(e) => update(stop.id, { color: e.target.value })} className="h-9 rounded-md border bg-background px-2 font-mono text-sm outline-none" />
              <input type="number" min={0} max={100} value={stop.pos} onChange={(e) => update(stop.id, { pos: Number(e.target.value) })} className="h-9 rounded-md border bg-background px-2 text-sm outline-none" />
              <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => removeStop(stop.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </Card>

        <Card className="overflow-hidden border-2 py-0">
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
            <h3 className="text-sm font-semibold">CSS</h3>
            <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(cssBlock)}><Copy className="mr-1 h-3.5 w-3.5" /> 复制</Button>
          </div>
          <pre className="whitespace-pre-wrap p-4 text-sm"><code>{cssBlock}</code></pre>
        </Card>
      </div>
    </div>
  );
}
