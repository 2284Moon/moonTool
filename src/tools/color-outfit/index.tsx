"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Copy, Dice5, Shuffle } from "lucide-react";

interface OutfitColors {
  hat: string;
  top: string;
  pants: string;
  shoes: string;
}

const PARTS: { key: keyof OutfitColors; label: string; emoji: string }[] = [
  { key: "hat", label: "帽子", emoji: "🧢" },
  { key: "top", label: "上衣", emoji: "👕" },
  { key: "pants", label: "裤子", emoji: "👖" },
  { key: "shoes", label: "鞋子", emoji: "👟" },
];

const PRESETS: { name: string; colors: OutfitColors }[] = [
  {
    name: "极简黑白灰",
    colors: { hat: "#2b2b2b", top: "#e8e8e8", pants: "#4a4a4a", shoes: "#161616" },
  },
  {
    name: "海军蓝",
    colors: { hat: "#1d3557", top: "#457b9d", pants: "#264653", shoes: "#101820" },
  },
  {
    name: "春日粉绿",
    colors: { hat: "#e5989b", top: "#b5e48c", pants: "#6d9772", shoes: "#5e548e" },
  },
  {
    name: "大地棕",
    colors: { hat: "#b08968", top: "#9c6644", pants: "#5e503f", shoes: "#352f2b" },
  },
  {
    name: "活力撞色",
    colors: { hat: "#ff9f1c", top: "#2ec4b6", pants: "#1b263b", shoes: "#0b132b" },
  },
  {
    name: "紫罗兰",
    colors: { hat: "#7b2cbf", top: "#c77dff", pants: "#3c096c", shoes: "#240046" },
  },
];

const PAIR_PRESETS: { name: string; colors: [string, string] }[] = [
  { name: "棕 × 白", colors: ["#8b5a3c", "#ffffff"] },
  { name: "浅灰 × 深灰", colors: ["#c9c9c9", "#4b4b4b"] },
  { name: "浅蓝 × 卡其", colors: ["#9cc3e5", "#c2a878"] },
  { name: "脏橘 × 铁灰", colors: ["#c1663b", "#565d66"] },
  { name: "黑 × 白", colors: ["#1c1c1c", "#ffffff"] },
  { name: "酒红 × 米白", colors: ["#7f2d3a", "#f2e8d5"] },
];

const CANVAS_W = 320;
const CANVAS_H = 480;
const CX = 160;

const SKIN = "#f6c9a0";
const HAIR = "#5a4632";

function clampByte(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/** delta 为正的十六进制调色，负数变暗，正数变亮 */
function shade(hex: string, delta: number) {
  const m = hex.replace("#", "");
  const full =
    m.length === 3
      ? m
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : m;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const r = clampByte(((num >> 16) & 255) + delta);
  const g = clampByte(((num >> 8) & 255) + delta);
  const b = clampByte((num & 255) + delta);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** 从左到右的光照渐变，让衣物有体积感 */
function lightGrad(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  base: string,
) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(base, 16));
  g.addColorStop(0.55, base);
  g.addColorStop(1, shade(base, -22));
  return g;
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

function randomScheme(): OutfitColors {
  const hue = Math.floor(Math.random() * 360);
  const twist = [30, 60, 150, 180, 210][Math.floor(Math.random() * 5)];
  return {
    hat: hslToHex(hue, 55 + Math.random() * 20, 45 + Math.random() * 15),
    top: hslToHex((hue + twist) % 360, 45 + Math.random() * 25, 50 + Math.random() * 15),
    pants: hslToHex((hue + 200) % 360, 25 + Math.random() * 20, 25 + Math.random() * 12),
    shoes: hslToHex((hue + 40) % 360, 20 + Math.random() * 15, 15 + Math.random() * 10),
  };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function mirror(ctx: CanvasRenderingContext2D, draw: () => void) {
  ctx.save();
  ctx.translate(CX * 2, 0);
  ctx.scale(-1, 1);
  draw();
  ctx.restore();
}

function drawLeg(ctx: CanvasRenderingContext2D, c: OutfitColors) {
  // 左腿裤型：胯部出发，膝盖微收，脚踝再收窄
  ctx.beginPath();
  ctx.moveTo(124, 250);
  ctx.quadraticCurveTo(116, 300, 122, 340);
  ctx.quadraticCurveTo(127, 370, 128, 402);
  ctx.lineTo(150, 402);
  ctx.quadraticCurveTo(153, 358, 155, 300);
  ctx.quadraticCurveTo(157, 274, 158, 252);
  ctx.closePath();
  ctx.fillStyle = lightGrad(ctx, 116, 158, c.pants);
  ctx.fill();
  // 内侧接缝阴影
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(151, 256);
  ctx.quadraticCurveTo(149, 330, 149, 400);
  ctx.stroke();
  // 膝盖褶皱
  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(126, 332);
  ctx.quadraticCurveTo(134, 338, 142, 333);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(127, 341);
  ctx.quadraticCurveTo(134, 346, 141, 342);
  ctx.stroke();
  // 裤脚翻边
  ctx.fillStyle = shade(c.pants, -14);
  roundRectPath(ctx, 127, 393, 24, 10, 4);
  ctx.fill();
}

function drawShoe(ctx: CanvasRenderingContext2D, c: OutfitColors) {
  // 鞋面
  ctx.fillStyle = lightGrad(ctx, 112, 156, c.shoes);
  roundRectPath(ctx, 114, 400, 42, 17, 8);
  ctx.fill();
  // 鞋头高光
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.ellipse(122, 407, 7, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // 鞋舌
  ctx.fillStyle = shade(c.shoes, 14);
  roundRectPath(ctx, 132, 400, 16, 9, 4);
  ctx.fill();
  // 鞋带
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(133 + i * 5.5, 401);
    ctx.lineTo(138 + i * 5.5, 407);
    ctx.stroke();
  }
  // 白色中底与外底
  ctx.fillStyle = "#efefef";
  roundRectPath(ctx, 112, 415, 46, 7, 3.5);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  roundRectPath(ctx, 112, 420, 46, 3, 1.5);
  ctx.fill();
}

function drawSleeve(ctx: CanvasRenderingContext2D, c: OutfitColors, swing: number) {
  ctx.save();
  ctx.translate(112, 176);
  ctx.rotate(0.12 + swing);
  ctx.fillStyle = lightGrad(ctx, -13, 13, c.top);
  roundRectPath(ctx, -12, -6, 24, 52, 11);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  roundRectPath(ctx, -12, 40, 24, 6, 3);
  ctx.fill();
  ctx.fillStyle = SKIN;
  roundRectPath(ctx, -9, 44, 18, 56, 9);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.beginPath();
  ctx.ellipse(0, 50, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.ellipse(0, 108, 9.5, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(9, 102, 4, 6.5, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTorso(ctx: CanvasRenderingContext2D, c: OutfitColors, breathe: number) {
  const w = 44 + breathe * 0.6;
  ctx.beginPath();
  ctx.moveTo(CX - 16, 162);
  ctx.quadraticCurveTo(CX - w + 6, 166, CX - w + 2, 186); // 肩部
  ctx.quadraticCurveTo(CX - w + 6, 220, CX - 36, 248); // 侧腰
  ctx.quadraticCurveTo(CX - 34, 258, CX - 26, 259); // 下摆左
  ctx.lineTo(CX + 26, 259);
  ctx.quadraticCurveTo(CX + 34, 258, CX + 36, 248);
  ctx.quadraticCurveTo(CX + w - 6, 220, CX + w - 2, 186);
  ctx.quadraticCurveTo(CX + w - 6, 166, CX + 16, 162);
  ctx.closePath();
  ctx.fillStyle = lightGrad(ctx, CX - 48, CX + 48, c.top);
  ctx.fill();
  // 下摆深色边
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  roundRectPath(ctx, CX - 34, 252, 68, 8, 4);
  ctx.fill();
  // 领口
  ctx.strokeStyle = shade(c.top, -22);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(CX, 163, 15, 7, 0, 0.08 * Math.PI, 0.92 * Math.PI);
  ctx.stroke();
  // 胸前布纹微阴影
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.beginPath();
  ctx.ellipse(CX - 14, 205, 16, 30, 0.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  blink: number,
) {
  // 眼白
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(x, y, 6.4, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // 虹膜 + 瞳孔 + 高光
  ctx.fillStyle = "#5d4030";
  ctx.beginPath();
  ctx.arc(x, y + 0.6, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#17110c";
  ctx.beginPath();
  ctx.arc(x, y + 0.8, 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(x - 1.7, y - 1.6, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // 眨眼：用肤色眼睑从上往下盖住
  if (blink > 0.02) {
    ctx.fillStyle = SKIN;
    ctx.fillRect(x - 7.5, y - 7.5, 15, 15 * blink);
    ctx.strokeStyle = shade(SKIN, -40);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 6.4, y - 7.5 + 15 * blink);
    ctx.quadraticCurveTo(x, y - 5.5 + 15 * blink, x + 6.4, y - 7.5 + 15 * blink);
    ctx.stroke();
  }
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  c: OutfitColors,
  t: number,
  bob: number,
) {
  const hy = 116 + bob;
  // 脖子
  ctx.fillStyle = shade(SKIN, -10);
  roundRectPath(ctx, CX - 9, 146, 18, 24, 7);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.beginPath();
  ctx.ellipse(CX, 150, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 耳朵
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.ellipse(CX - 33, hy + 6, 5.5, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(CX + 33, hy + 6, 5.5, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shade(SKIN, -35);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(CX - 33.5, hy + 6, 2.4, 4.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(CX + 33.5, hy + 6, 2.4, 4.6, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 鬓角头发
  ctx.fillStyle = HAIR;
  roundRectPath(ctx, CX - 32, hy - 26, 6, 24, 3);
  ctx.fill();
  roundRectPath(ctx, CX + 26, hy - 26, 6, 24, 3);
  ctx.fill();

  // 头部（椭圆，稍带体积）
  ctx.fillStyle = lightGrad(ctx, CX - 34, CX + 34, SKIN);
  ctx.beginPath();
  ctx.ellipse(CX, hy, 33, 37, 0, 0, Math.PI * 2);
  ctx.fill();

  // 眉毛
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(CX - 20, hy - 12);
  ctx.quadraticCurveTo(CX - 14, hy - 15, CX - 8, hy - 12.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CX + 8, hy - 12.5);
  ctx.quadraticCurveTo(CX + 14, hy - 15, CX + 20, hy - 12);
  ctx.stroke();

  // 眼睛（约每 3.6s 眨一次）
  const phase = t % 3.6;
  const blink = phase < 0.18 ? Math.sin((phase / 0.18) * Math.PI) : 0;
  drawEye(ctx, CX - 13, hy + 1, blink);
  drawEye(ctx, CX + 13, hy + 1, blink);

  // 鼻子
  ctx.strokeStyle = shade(SKIN, -55);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(CX, hy + 6);
  ctx.quadraticCurveTo(CX + 3.5, hy + 12, CX - 0.5, hy + 13.5);
  ctx.stroke();

  // 微笑
  ctx.strokeStyle = "#8a4a3a";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(CX, hy + 16, 10, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();

  // 腮红
  ctx.fillStyle = "rgba(238,120,108,0.20)";
  ctx.beginPath();
  ctx.ellipse(CX - 22, hy + 12, 6, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(CX + 22, hy + 12, 6, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // ===== 帽子 =====
  const hatY = hy - 22;
  // 帽冠（微收的圆顶）
  ctx.fillStyle = lightGrad(ctx, CX - 32, CX + 32, c.hat);
  ctx.beginPath();
  ctx.moveTo(CX - 32, hatY + 2);
  ctx.bezierCurveTo(CX - 32, hatY - 26, CX - 18, hatY - 36, CX, hatY - 36);
  ctx.bezierCurveTo(CX + 18, hatY - 36, CX + 32, hatY - 26, CX + 32, hatY + 2);
  ctx.closePath();
  ctx.fill();
  // 帽冠拼缝
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(CX, hatY - 36);
  ctx.quadraticCurveTo(CX - 3, hatY - 16, CX - 4, hatY + 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CX, hatY - 36);
  ctx.quadraticCurveTo(CX + 3, hatY - 16, CX + 4, hatY + 1);
  ctx.stroke();
  // 顶部纽扣
  ctx.fillStyle = shade(c.hat, 18);
  ctx.beginPath();
  ctx.arc(CX, hatY - 36, 3.4, 0, Math.PI * 2);
  ctx.fill();
  // 帽带
  ctx.fillStyle = shade(c.hat, -16);
  roundRectPath(ctx, CX - 32, hatY - 6, 64, 9, 4);
  ctx.fill();
  // 帽檐（底面 + 上面，带前缘弧度）
  ctx.fillStyle = shade(c.hat, -26);
  ctx.beginPath();
  ctx.ellipse(CX, hatY + 7, 52, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lightGrad(ctx, CX - 52, CX + 52, c.hat);
  ctx.beginPath();
  ctx.ellipse(CX, hatY + 3, 52, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // 帽檐高光
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  ctx.ellipse(CX - 18, hatY + 1, 22, 3.2, -0.06, 0, Math.PI * 2);
  ctx.fill();
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  c: OutfitColors,
  t: number,
) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // 呼吸与浮动
  const breathe = Math.sin((t * Math.PI * 2) / 4);
  const bob = breathe * 1.3;
  const swing = Math.sin((t * Math.PI * 2) / 4) * 0.012;

  // 地面阴影
  ctx.fillStyle = "rgba(30,50,80,0.14)";
  ctx.beginPath();
  ctx.ellipse(CX, 432, 92, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(30,50,80,0.10)";
  ctx.beginPath();
  ctx.ellipse(CX, 428, 46, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // 腿 → 鞋 → 躯干 → 手臂 → 头部（自下而上叠放）
  drawLeg(ctx, c);
  mirror(ctx, () => drawLeg(ctx, c));
  drawShoe(ctx, c);
  mirror(ctx, () => drawShoe(ctx, c));
  drawTorso(ctx, c, breathe);
  drawSleeve(ctx, c, swing);
  mirror(ctx, () => drawSleeve(ctx, c, -swing));
  drawHead(ctx, c, t, bob);
}

export function ColorOutfit() {
  const [colors, setColors] = useState<OutfitColors>(PRESETS[1].colors);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<
    Record<keyof OutfitColors, boolean>
  >({ hat: true, top: true, pants: true, shoes: true });
  const [pairA, setPairA] = useState("#8b5a3c");
  const [pairB, setPairB] = useState("#ffffff");

  const anySelected = PARTS.some((part) => selected[part.key]);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const togglePart = (key: keyof OutfitColors) => {
    const next = { ...selectedRef.current, [key]: !selectedRef.current[key] };
    selectedRef.current = next;
    setSelected(next);
  };

  const setSelection = (keys: (keyof OutfitColors)[]) => {
    const next = {
      hat: keys.includes("hat"),
      top: keys.includes("top"),
      pants: keys.includes("pants"),
      shoes: keys.includes("shoes"),
    };
    selectedRef.current = next;
    setSelected(next);
  };

  const applyPair = (a: string, b: string) => {
    const current = selectedRef.current;
    if (!PARTS.some((part) => current[part.key])) return;
    let used = 0;
    setColors((prev) => {
      const next = { ...prev };
      for (const part of PARTS) {
        if (current[part.key]) next[part.key] = used++ % 2 === 0 ? a : b;
        else next[part.key] = "#ffffff";
      }
      return next;
    });
  };
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      drawCharacter(ctx, colors, (now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [colors]);

  const setColor = (key: keyof OutfitColors, value: string) =>
    setColors((prev) => ({ ...prev, [key]: value }));

  const copyScheme = useCallback(() => {
    const text = PARTS.map(
      (part) => `${part.label}: ${colors[part.key]}`,
    ).join("\n");
    navigator.clipboard
      .writeText(`${text}\nCSS: ${Object.values(colors).join(" ")}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
  }, [colors]);

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="self-start overflow-hidden border-2 py-0 lg:sticky lg:top-20">
        <div className="border-b bg-muted/50 px-4 py-2">
          <h2 className="text-sm font-semibold">人物预览</h2>
          <p className="text-xs text-muted-foreground">
            Canvas 手绘，会眨眼和呼吸，调色实时生效
          </p>
        </div>
        <div className="flex justify-center bg-gradient-to-b from-sky-50 via-sky-100/50 to-sky-200/60 p-4 dark:from-slate-800 dark:to-slate-900">
          <canvas
            ref={canvasRef}
            style={{ width: CANVAS_W, height: CANVAS_H }}
          />
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="space-y-3 border-2 p-4">
          <h3 className="text-sm font-semibold">衣服配色</h3>
          {PARTS.map((part) => (
            <div key={part.key} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected[part.key]}
                onChange={() => togglePart(part.key)}
                aria-label={`选择${part.label}参与换色`}
                className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
              />
              <span className="w-16 shrink-0 text-sm">
                {part.emoji} {part.label}
              </span>
              <input
                type="color"
                value={colors[part.key]}
                onChange={(event) => setColor(part.key, event.target.value)}
                className="h-9 w-10 shrink-0 cursor-pointer rounded border"
              />
              <input
                value={colors[part.key]}
                onChange={(event) => setColor(part.key, event.target.value)}
                className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
                spellCheck={false}
              />
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-xs text-muted-foreground">快速选择：</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelection(["hat", "top", "pants", "shoes"])}
            >
              全选
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelection(["hat", "shoes"])}
            >
              帽 + 鞋
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelection(["top", "pants"])}
            >
              衣 + 裤
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            勾选的部位参与"双色搭配"换色，未勾选的部位套用时会变成纯白；
            每行的颜色框可以随时单独给某个部位调色。
          </p>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => setColors(randomScheme())}>
              <Dice5 className="mr-1 h-3.5 w-3.5" /> 随机一套
            </Button>
            <Button size="sm" variant="outline" onClick={copyScheme}>
              {copied ? (
                <Check className="mr-1 h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="mr-1 h-3.5 w-3.5" />
              )}
              {copied ? "已复制" : "复制配色"}
            </Button>
          </div>
        </Card>

        <Card className="space-y-3 border-2 p-4">
          <h3 className="text-sm font-semibold">双色搭配</h3>
          <p className="text-xs text-muted-foreground">
            两个颜色按 A / B / A / B 交替涂到已勾选的部位，其余部位变纯白
          </p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={pairA}
              onChange={(event) => setPairA(event.target.value)}
              className="h-9 w-12 shrink-0 cursor-pointer rounded border"
              aria-label="搭配颜色 A"
            />
            <span className="font-mono text-xs text-muted-foreground">A</span>
            <Button
              size="sm"
              variant="ghost"
              aria-label="交换并应用 A 和 B"
              onClick={() => {
                setPairA(pairB);
                setPairB(pairA);
                applyPair(pairB, pairA);
              }}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <span className="font-mono text-xs text-muted-foreground">B</span>
            <input
              type="color"
              value={pairB}
              onChange={(event) => setPairB(event.target.value)}
              className="h-9 w-12 shrink-0 cursor-pointer rounded border"
              aria-label="搭配颜色 B"
            />
            <Button
              size="sm"
              className="ml-auto"
              onClick={() => applyPair(pairA, pairB)}
              disabled={!anySelected}
            >
              应用到已勾选
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PAIR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                disabled={!anySelected}
                onClick={() => {
                  setPairA(preset.colors[0]);
                  setPairB(preset.colors[1]);
                  applyPair(preset.colors[0], preset.colors[1]);
                }}
                className="rounded-lg border p-2 text-left transition-colors hover:border-primary hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex h-6 overflow-hidden rounded">
                  <span
                    className="flex-1"
                    style={{ background: preset.colors[0] }}
                  />
                  <span
                    className="flex-1"
                    style={{ background: preset.colors[1] }}
                  />
                </div>
                <div className="mt-1.5 text-xs font-medium">{preset.name}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="space-y-3 border-2 p-4">
          <h3 className="text-sm font-semibold">推荐方案</h3>
          <p className="text-xs text-muted-foreground">
            点击一键套用整套配色
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setColors(preset.colors)}
                className="rounded-lg border p-2 text-left transition-colors hover:border-primary hover:bg-muted/40"
              >
                <div className="flex h-6 overflow-hidden rounded">
                  {PARTS.map((part) => (
                    <span
                      key={part.key}
                      className="flex-1"
                      style={{ background: preset.colors[part.key] }}
                    />
                  ))}
                </div>
                <div className="mt-1.5 text-xs font-medium">{preset.name}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
