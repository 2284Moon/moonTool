"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, X, Pause, Play, Clock, RefreshCw } from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";

dayjs.extend(utc);
dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

// ====== 时区列表 ======

const TIMEZONES: { name: string; tz: string }[] = [
  { name: "洛杉矶", tz: "America/Los_Angeles" },
  { name: "纽约", tz: "America/New_York" },
  { name: "圣保罗", tz: "America/Sao_Paulo" },
  { name: "伦敦", tz: "Europe/London" },
  { name: "巴黎", tz: "Europe/Paris" },
  { name: "莫斯科", tz: "Europe/Moscow" },
  { name: "迪拜", tz: "Asia/Dubai" },
  { name: "新德里", tz: "Asia/Kolkata" },
  { name: "北京/上海", tz: "Asia/Shanghai" },
  { name: "东京", tz: "Asia/Tokyo" },
  { name: "悉尼", tz: "Australia/Sydney" },
  { name: "奥克兰", tz: "Pacific/Auckland" },
];

function fmtTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: tz,
    hour12: false,
  }).format(date);
}

function utcOffsetLabel(tz: string, date: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  return parts.find((p) => p.type === "timeZoneName")?.value || "";
}

// ====== 组件 ======

export function TimestampConverter() {
  // --- 实时时钟 ---
  const [now, setNow] = useState(new Date());
  const [clockRunning, setClockRunning] = useState(true);

  useEffect(() => {
    if (!clockRunning) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [clockRunning]);

  // --- 时间戳 → 日期 ---
  const [tsInput, setTsInput] = useState("");
  const [tsUnit, setTsUnit] = useState<"s" | "ms">("s");
  const [tsResult, setTsResult] = useState<dayjs.Dayjs | null>(null);
  const [tsError, setTsError] = useState("");

  useEffect(() => {
    if (!tsInput.trim()) {
      setTsResult(null);
      setTsError("");
      return;
    }
    const n = parseInt(tsInput.trim());
    if (isNaN(n) || n < 0) {
      setTsResult(null);
      setTsError("请输入有效的数字时间戳");
      return;
    }
    setTsError("");
    if (tsUnit === "s") {
      // 秒级时间戳，限制合理范围
      if (n < 1e8 || n > 1e11) {
        setTsResult(null);
        setTsError("秒级时间戳通常为 10 位数字");
        return;
      }
      setTsResult(dayjs.unix(n));
    } else {
      if (n < 1e11 || n > 1e14) {
        setTsResult(null);
        setTsError("毫秒级时间戳通常为 13 位数字");
        return;
      }
      setTsResult(dayjs(n));
    }
  }, [tsInput, tsUnit]);

  const tsLocal = tsResult ? tsResult.format("YYYY-MM-DD HH:mm:ss") : "";
  const tsUtc = tsResult ? tsResult.utc().format("YYYY-MM-DD HH:mm:ss") + " UTC" : "";
  const tsIso = tsResult ? tsResult.toISOString() : "";
  const tsRelative = tsResult ? tsResult.fromNow() : "";

  // --- 日期 → 时间戳 ---
  const [dtDate, setDtDate] = useState("");
  const [dtTime, setDtTime] = useState("");
  const [dtResult, setDtResult] = useState<{ seconds: number; millis: number } | null>(null);
  const [dtError, setDtError] = useState("");

  useEffect(() => {
    if (!dtDate && !dtTime) {
      setDtResult(null);
      setDtError("");
      return;
    }
    try {
      const d = dayjs(`${dtDate || dayjs().format("YYYY-MM-DD")}T${dtTime || "00:00:00"}`);
      if (!d.isValid()) {
        setDtResult(null);
        setDtError("无效的日期时间");
        return;
      }
      setDtError("");
      const millis = d.valueOf();
      setDtResult({ seconds: Math.floor(millis / 1000), millis });
    } catch {
      setDtResult(null);
      setDtError("日期解析失败");
    }
  }, [dtDate, dtTime]);

  // 复制
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
  };

  // 清空时间戳输入
  const handleClearTs = () => {
    setTsInput("");
    setTsResult(null);
    setTsError("");
  };

  // 清空日期输入
  const handleClearDt = () => {
    setDtDate("");
    setDtTime("");
    setDtResult(null);
    setDtError("");
  };

  // 填充当前时间
  const fillNow = () => {
    const d = dayjs();
    setDtDate(d.format("YYYY-MM-DD"));
    setDtTime(d.format("HH:mm:ss"));
  };

  // 填充当前时间戳
  const fillNowTs = () => {
    if (tsUnit === "s") {
      setTsInput(String(Math.floor(Date.now() / 1000)));
    } else {
      setTsInput(String(Date.now()));
    }
  };

  const unixNow = Math.floor(now.getTime() / 1000);

  const labelClass = "text-xs font-medium text-muted-foreground";
  const valueClass = "font-mono text-sm";

  return (
    <div className="w-full space-y-5">
      {/* ============ 实时时钟 ============ */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4" />
            实时时钟
          </h3>
          <div className="flex gap-1">
            <Button
              variant={clockRunning ? "secondary" : "outline"}
              size="sm"
              onClick={() => setClockRunning(!clockRunning)}
            >
              {clockRunning ? (
                <Pause className="mr-1 h-3.5 w-3.5" />
              ) : (
                <Play className="mr-1 h-3.5 w-3.5" />
              )}
              {clockRunning ? "暂停" : "继续"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className={labelClass}>本地时间</div>
            <div className={valueClass} suppressHydrationWarning>{now.toLocaleString("zh-CN", { hour12: false })}</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className={labelClass}>UTC 时间</div>
            <div className={valueClass} suppressHydrationWarning>{now.toISOString().slice(0, 19).replace("T", " ")} UTC</div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className={labelClass}>Unix 秒</div>
            <div className="flex items-center gap-2">
              <span className={valueClass} suppressHydrationWarning>{unixNow}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleCopy(String(unixNow))}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className={labelClass}>Unix 毫秒</div>
            <div className="flex items-center gap-2">
              <span className={valueClass} suppressHydrationWarning>{now.getTime()}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleCopy(String(now.getTime()))}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 sm:col-span-2">
            <div className={labelClass}>ISO 8601</div>
            <div className={valueClass} suppressHydrationWarning>{now.toISOString()}</div>
          </div>
        </div>
      </Card>

      {/* ============ 时间戳 → 日期 ============ */}
      <Card className="space-y-4 p-5">
        <h3 className="text-sm font-semibold">📥 时间戳 → 日期</h3>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-1.5" style={{ minWidth: 200 }}>
            <label className={labelClass}>输入 Unix 时间戳</label>
            <input
              className="h-9 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm placeholder:text-muted-foreground/40 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder={tsUnit === "s" ? "例如 1715644245" : "例如 1715644245000"}
              value={tsInput}
              onChange={(e) => setTsInput(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-1 py-0.5">
            <Button
              variant={tsUnit === "s" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setTsUnit("s"); setTsInput(""); setTsResult(null); setTsError(""); }}
            >
              秒
            </Button>
            <Button
              variant={tsUnit === "ms" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setTsUnit("ms"); setTsInput(""); setTsResult(null); setTsError(""); }}
            >
              毫秒
            </Button>
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={fillNowTs}>
            当前
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={handleClearTs} disabled={!tsInput}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {tsError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {tsError}
          </div>
        )}

        {tsResult && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ResultCard label="本地时间" value={tsLocal} onCopy={() => handleCopy(tsLocal)} />
            <ResultCard label="UTC 时间" value={tsUtc} onCopy={() => handleCopy(tsUtc)} />
            <ResultCard label="ISO 8601" value={tsIso} onCopy={() => handleCopy(tsIso)} />
            <ResultCard label="相对时间" value={tsRelative} />
          </div>
        )}
      </Card>

      {/* ============ 日期 → 时间戳 ============ */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">📤 日期 → 时间戳</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={fillNow}>
              <Clock className="mr-1 h-3.5 w-3.5" /> 当前时间
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={handleClearDt} disabled={!dtDate && !dtTime}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="h-10 w-40 rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={dtDate}
            onChange={(e) => setDtDate(e.target.value)}
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="time"
            step="1"
            className="h-10 w-36 rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            value={dtTime}
            onChange={(e) => setDtTime(e.target.value)}
          />
        </div>

        {dtError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {dtError}
          </div>
        )}

        {dtResult && (
          <div className="rounded-xl border-2 border-dashed border-green-500/30 bg-muted/20 p-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">转换结果</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg bg-background px-4 py-3">
                <div>
                  <div className="text-xs text-muted-foreground">Unix 秒</div>
                  <div className="font-mono text-lg font-semibold tabular-nums">{dtResult.seconds.toLocaleString()}</div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCopy(String(dtResult.seconds))}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-background px-4 py-3">
                <div>
                  <div className="text-xs text-muted-foreground">Unix 毫秒</div>
                  <div className="font-mono text-lg font-semibold tabular-nums">{dtResult.millis.toLocaleString()}</div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCopy(String(dtResult.millis))}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ============ 时区速查 ============ */}
      <Card className="space-y-3 p-5">
        <h3 className="text-sm font-semibold">🌍 时区速查</h3>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">城市</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">UTC 偏移</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">当地时间</th>
              </tr>
            </thead>
            <tbody>
              {TIMEZONES.map(({ name, tz }) => {
                const offset = utcOffsetLabel(tz, now);
                return (
                  <tr key={tz} className="border-t transition-colors hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{name}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{offset}</td>
                    <td className="px-4 py-2.5 font-mono" suppressHydrationWarning>{fmtTz(now, tz)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ====== 小卡片组件 ======

function ResultCard({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 truncate font-mono text-sm text-foreground">{value}</div>
      </div>
      {onCopy && (
        <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0" onClick={onCopy}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
