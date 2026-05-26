"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, X } from "lucide-react";

// ====== 常量 ======

const WEEKDAY_NAMES: Record<number, string> = {
  0: "周日", 1: "周一", 2: "周二", 3: "周三", 4: "周四", 5: "周五", 6: "周六",
  7: "周日",
};

const MONTH_NAMES: Record<number, string> = {
  1: "1月", 2: "2月", 3: "3月", 4: "4月", 5: "5月", 6: "6月",
  7: "7月", 8: "8月", 9: "9月", 10: "10月", 11: "11月", 12: "12月",
};

interface FieldDef {
  key: string;
  label: string;
  min: number;
  max: number;
  quickValues: string[];
  nameMap?: Record<number, string>;
}

const FIELDS: FieldDef[] = [
  { key: "minute", label: "分钟", min: 0, max: 59, quickValues: ["*", "*/5", "*/15", "0", "30"] },
  { key: "hour", label: "小时", min: 0, max: 23, quickValues: ["*", "*/2", "0", "8", "12", "18"] },
  { key: "day", label: "日期", min: 1, max: 31, quickValues: ["*", "1", "15", "L"] },
  { key: "month", label: "月份", min: 1, max: 12, quickValues: ["*", "1", "3", "6", "9", "12"], nameMap: MONTH_NAMES },
  { key: "weekday", label: "星期", min: 0, max: 7, quickValues: ["*", "0", "1", "1-5", "6"], nameMap: WEEKDAY_NAMES },
];

// ====== 常用预设 ======

interface Preset {
  name: string;
  cron: string;
}

const PRESETS: Preset[] = [
  { name: "每分钟", cron: "* * * * *" },
  { name: "每5分钟", cron: "*/5 * * * *" },
  { name: "每15分钟", cron: "*/15 * * * *" },
  { name: "每小时", cron: "0 * * * *" },
  { name: "每天0点", cron: "0 0 * * *" },
  { name: "每天8点", cron: "0 8 * * *" },
  { name: "工作日9点", cron: "0 9 * * 1-5" },
  { name: "每周一0点", cron: "0 0 * * 1" },
  { name: "每月1号0点", cron: "0 0 1 * *" },
  { name: "每月最后一天", cron: "0 0 L * *" },
  { name: "每季度首日", cron: "0 0 1 1,4,7,10 *" },
  { name: "每年元旦", cron: "0 0 1 1 *" },
  { name: "工作日每2小时", cron: "0 */2 * * 1-5" },
];

// ====== 解析器 ======

/** 小时 → 时段 */
function timeOfDay(h: number): string {
  if (h >= 0 && h <= 5) return "凌晨";
  if (h >= 6 && h <= 8) return "早晨";
  if (h >= 9 && h <= 11) return "上午";
  if (h === 12) return "中午";
  if (h >= 13 && h <= 17) return "下午";
  return "晚上";
}

/** 格式化时间 HH:MM → "上午 9:00" */
function fmtTime(h: number, m: number): string {
  const period = timeOfDay(h);
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  if (m === 0) return `${period} ${h}:00`;
  return `${period} ${h}:${mm}`;
}

/** 原始值是否为 "*" */
function isAny(v: string) { return v === "*"; }

/** 提取数值 */
function num(v: string): number | null {
  const n = parseInt(v);
  return isNaN(n) ? null : n;
}

/** 解析单个字段为中文 */
function parseField(value: string, def: FieldDef): string {
  const nameMap = def.nameMap;
  const fmt = (n: number) => nameMap?.[n] ?? String(n);

  if (!value || value === "*") return `每${def.label}`;

  const stepMatch = value.match(/^\*\/(\d+)$/);
  if (stepMatch) return `每隔 ${stepMatch[1]} ${def.label}`;

  const rangeStepMatch = value.match(/^(\d+)-(\d+)\/(\d+)$/);
  if (rangeStepMatch) {
    return `${fmt(+rangeStepMatch[1])} 至 ${fmt(+rangeStepMatch[2])}，每 ${rangeStepMatch[3]} ${def.label}`;
  }

  const rangeMatch = value.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const a = fmt(+rangeMatch[1]), b = fmt(+rangeMatch[2]);
    if (def.key === "weekday") return `${a} 至 ${b}`;
    return `${a} 到 ${b} 日`;
  }

  if (value === "L") {
    if (def.key === "day") return "最后一天";
    return "最后";
  }

  if (value.includes(",")) {
    const parts = value.split(",").map((v) => {
      const n = parseInt(v);
      return isNaN(n) ? v : fmt(n);
    });
    return parts.join("、");
  }

  const n = parseInt(value);
  if (!isNaN(n)) return fmt(n);
  return value;
}

/** 解析完整 crontab → 自然中文 */
function parseCron(cron: string): { human: string; fields: { label: string; value: string; text: string }[] } {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return { human: "无效的 Cron 表达式（需要 5 个字段）", fields: [] };

  const raw = parts.slice(0, 5);
  const fieldTexts = raw.map((v, i) => ({
    label: FIELDS[i].label,
    value: v,
    text: parseField(v, FIELDS[i]),
  }));

  const [m, h, d, mon, w] = raw;

  // 构造时间部分
  function timePart(): string {
    const mn = num(m);
    const hn = num(h);

    // 分钟是 */N 步进
    const minStep = m.match(/^\*\/(\d+)$/);
    if (minStep && isAny(h)) return `每隔 ${minStep[1]} 分钟`;

    // 小时是 */N 步进
    const hourStep = h.match(/^\*\/(\d+)$/);
    if (hourStep && !isAny(h)) {
      const base = mn ?? 0;
      return `每隔 ${hourStep[1]} 小时的第 ${base} 分钟`;
    }

    // 具体时间
    if (hn !== null && mn !== null) {
      return fmtTime(hn, mn);
    }
    // 小时列表
    if (h.includes(",") && mn !== null) {
      const hours = h.split(",").map((x) => timeOfDay(+x) + " " + x + ":" + String(mn).padStart(2, "0"));
      return hours.join("、");
    }
    // 小时范围
    const hourRange = h.match(/^(\d+)-(\d+)$/);
    if (hourRange && mn !== null) {
      return `${fmtTime(+hourRange[1], mn)} 至 ${fmtTime(+hourRange[2], mn)}`;
    }

    if (mn !== null) return `每小时的第 ${mn} 分钟`;
    return h === "*" ? "" : h;
  }

  // 构造日期部分
  function datePart(): string {
    const weekParts: string[] = [];
    const monthParts: string[] = [];
    const dayParts: string[] = [];

    // 星期
    if (!isAny(w)) {
      const wText = parseField(w, FIELDS[4]);
      if (w === "1-5") weekParts.push("工作日（周一至周五）");
      else if (w === "0" || w === "7") weekParts.push("每周日");
      else if (w === "6") weekParts.push("每周六");
      else if (w === "0,6" || w === "6,0" || w === "6,7" || w === "7,6") weekParts.push("每周末");
      else weekParts.push(wText);
    }

    // 月份
    if (!isAny(mon)) {
      monthParts.push(parseField(mon, FIELDS[3]));
    }

    // 日期
    if (!isAny(d)) {
      if (d === "L") dayParts.push("最后一天");
      else dayParts.push(parseField(d, FIELDS[2]) + " 号");
    }

    if (weekParts.length > 0) return weekParts.join("、");
    if (monthParts.length > 0 && dayParts.length > 0) return monthParts[0] + dayParts[0];
    if (dayParts.length > 0) return "每月 " + dayParts[0];
    if (monthParts.length > 0) return monthParts[0];
    return "";
  }

  const time = timePart();
  const date = datePart();

  let human: string;

  // 纯间隔类型
  if (m.startsWith("*/") && isAny(h) && isAny(d) && isAny(mon) && isAny(w)) {
    human = `每隔 ${m.slice(2)} 分钟执行一次`;
  } else if (isAny(m) && isAny(h) && isAny(d) && isAny(mon) && isAny(w)) {
    human = "每分钟执行一次";
  } else if (date) {
    human = `在${date}的 ${time} 执行`;
  } else if (time) {
    human = `每天 ${time} 执行`;
  } else {
    human = `${time}执行`;
  }

  // 美化和清理
  human = human
    .replace(/\s+/g, " ")
    .replace(/的 的/g, "的")
    .replace(/在每/g, "每")
    .replace(/：/g, ":")
    .replace(/在(\S+)的/, "在 $1 的")
    .trim();

  return { human, fields: fieldTexts };
}

// ====== 组件 ======

type Mode = "build" | "parse";

export function CronTool() {
  const [mode, setMode] = useState<Mode>("build");

  // --- 生成器状态 ---
  const [fields, setFields] = useState<string[]>(["*", "*", "*", "*", "*"]);
  const [customInputs, setCustomInputs] = useState<string[]>(["", "", "", "", ""]);

  const cronExpr = fields.join(" ");

  const cronParsed = useMemo(() => parseCron(cronExpr), [cronExpr]);

  const setField = (i: number, value: string) => {
    setFields((prev) => { const n = [...prev]; n[i] = value; return n; });
  };

  const handlePreset = (cron: string) => {
    const parts = cron.split(/\s+/);
    setFields(parts.slice(0, 5));
    setCustomInputs(["", "", "", "", ""]);
  };

  const handleQuickValue = (fieldIdx: number, value: string) => {
    setField(fieldIdx, value);
    const ci = [...customInputs];
    ci[fieldIdx] = "";
    setCustomInputs(ci);
  };

  const handleCustomInput = (fieldIdx: number, value: string) => {
    const ci = [...customInputs];
    ci[fieldIdx] = value;
    setCustomInputs(ci);
    setField(fieldIdx, value);
  };

  // --- 解析器状态 ---
  const [parseInput, setParseInput] = useState("");
  const parseResult = useMemo(() => {
    if (!parseInput.trim()) return null;
    return parseCron(parseInput.trim());
  }, [parseInput]);

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  };

  const handleClearBuilder = () => {
    setFields(["*", "*", "*", "*", "*"]);
    setCustomInputs(["", "", "", "", ""]);
  };

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">⏰ Cron 表达式工具</h2>
        <p className="text-sm text-muted-foreground">生成、解析 Cron 表达式，支持常用预设</p>
      </div>

      {/* 模式切换 */}
      <div className="flex items-center justify-center gap-2">
        <Button variant={mode === "build" ? "default" : "outline"} size="sm" onClick={() => setMode("build")}>
          🔧 生成 Cron
        </Button>
        <Button variant={mode === "parse" ? "default" : "outline"} size="sm" onClick={() => setMode("parse")}>
          🔍 解析 Cron
        </Button>
      </div>

      {/* ============ 生成模式 ============ */}
      {mode === "build" && (
        <>
          {/* 常用预设 */}
          <Card className="space-y-3 p-5">
            <h3 className="text-sm font-semibold">📋 常用预设</h3>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p.name}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handlePreset(p.cron)}
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </Card>

          {/* 字段配置 */}
          <Card className="space-y-5 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">🔧 字段配置</h3>
              <Button variant="outline" size="sm" onClick={handleClearBuilder}>
                <X className="mr-1 h-3.5 w-3.5" /> 重置
              </Button>
            </div>
            {FIELDS.map((def, idx) => (
              <div key={def.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-right text-xs font-medium text-muted-foreground">
                    {def.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {def.quickValues.map((v) => (
                      <Button
                        key={v}
                        variant={fields[idx] === v ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 min-w-10 px-2 font-mono text-xs"
                        onClick={() => handleQuickValue(idx, v)}
                      >
                        {v}
                      </Button>
                    ))}
                    <input
                      className="h-7 w-28 rounded-md border border-input bg-background px-2 font-mono text-xs focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      placeholder="自定义"
                      value={customInputs[idx]}
                      onChange={(e) => handleCustomInput(idx, e.target.value)}
                      spellCheck={false}
                    />
                  </div>
                </div>
                {/* 当前值的可读解释 */}
                <div className="ml-12 text-xs text-muted-foreground">
                  → {parseField(fields[idx], def)}
                </div>
              </div>
            ))}
          </Card>

          {/* 结果 */}
          <Card className="space-y-3 border-2 border-dashed border-green-500/30 p-5">
            <h3 className="text-sm font-semibold">🎉 生成结果</h3>
            <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-4">
              <code className="flex-1 font-mono text-lg font-semibold tracking-wider">
                {cronExpr}
              </code>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCopy(cronExpr)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              📖 {cronParsed.human}
            </div>
          </Card>
        </>
      )}

      {/* ============ 解析模式 ============ */}
      {mode === "parse" && (
        <>
          {/* 输入 */}
          <Card className="space-y-3 p-5">
            <h3 className="text-sm font-semibold">📥 输入 Cron 表达式</h3>
            <div className="flex gap-2">
              <input
                className="h-10 flex-1 rounded-lg border border-input bg-background px-4 font-mono text-lg tracking-wider focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="* * * * *"
                value={parseInput}
                onChange={(e) => setParseInput(e.target.value)}
                spellCheck={false}
              />
              <Button variant="outline" size="sm" className="h-10" onClick={() => setParseInput("")} disabled={!parseInput}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* 快捷填入 */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.slice(0, 8).map((p) => (
                <Button
                  key={p.name}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setParseInput(p.cron)}
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </Card>

          {/* 解析结果 */}
          {parseResult && (
            <>
              <Card className="space-y-3 border-2 border-dashed border-green-500/30 p-5">
                <h3 className="text-sm font-semibold">📖 解析结果</h3>
                <div className="rounded-lg bg-green-50 px-4 py-3 text-base font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
                  {parseResult.human}
                </div>
              </Card>

              <Card className="space-y-3 p-5">
                <h3 className="text-sm font-semibold">🔬 字段详解</h3>
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">字段</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">值</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">含义</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.fields.map((f) => (
                        <tr key={f.label} className="border-t transition-colors hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-medium">{f.label}</td>
                          <td className="px-4 py-2.5 font-mono">{f.value}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{f.text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
