"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

// ====== 城市列表（按 UTC 偏移大致自西向东排列）======

// capital 为空表示该城市本身就是首都（如巴黎），卡片显示「该国首都」
const CITIES: { name: string; country: string; capital?: string; tz: string }[] = [
  { name: "洛杉矶", country: "美国", capital: "华盛顿", tz: "America/Los_Angeles" },
  { name: "纽约", country: "美国", capital: "华盛顿", tz: "America/New_York" },
  { name: "圣保罗", country: "巴西", capital: "巴西利亚", tz: "America/Sao_Paulo" },
  { name: "伦敦", country: "英国", tz: "Europe/London" },
  { name: "巴黎", country: "法国", tz: "Europe/Paris" },
  { name: "莫斯科", country: "俄罗斯", tz: "Europe/Moscow" },
  { name: "迪拜", country: "阿联酋", capital: "阿布扎比", tz: "Asia/Dubai" },
  { name: "新德里", country: "印度", tz: "Asia/Kolkata" },
  { name: "北京", country: "中国", tz: "Asia/Shanghai" },
  { name: "新加坡", country: "新加坡", tz: "Asia/Singapore" },
  { name: "东京", country: "日本", tz: "Asia/Tokyo" },
  { name: "悉尼", country: "澳大利亚", capital: "堪培拉", tz: "Australia/Sydney" },
  { name: "奥克兰", country: "新西兰", capital: "惠灵顿", tz: "Pacific/Auckland" },
];

// ====== 时区格式化 ======

// 每秒 × 14 个时区重复创建 DateTimeFormat 开销可观，按 tz 缓存实例
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(tz: string): Intl.DateTimeFormat {
  let fmt = formatterCache.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("zh-CN", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
      // hour12: false 在部分引擎的午夜会输出 "24"，显式用 h23 保证零点显示 00
      hourCycle: "h23",
    });
    formatterCache.set(tz, fmt);
  }
  return fmt;
}

function zoneNow(tz: string, date: Date) {
  const parts = getFormatter(tz).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour"));
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: get("weekday"),
    time: `${get("hour")}:${get("minute")}:${get("second")}`,
    isDay: hour >= 6 && hour < 18,
  };
}

// 该时区此刻相对 UTC 的偏移分钟数（正向东）
function tzOffsetMinutes(tz: string, date: Date): number {
  const parts = getFormatter(tz).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0";
  const asUTC = Date.UTC(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    Number(get("hour")),
    Number(get("minute")),
    Number(get("second")),
  );
  return Math.round((asUTC - date.getTime()) / 60000);
}

function offsetLabel(offsetMin: number): string {
  const sign = offsetMin < 0 ? "-" : "+";
  const abs = Math.abs(offsetMin);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${h}:${m}`;
}

function diffLabel(tzOffsetMin: number, localOffsetMin: number): string {
  const diff = tzOffsetMin - localOffsetMin;
  if (diff === 0) return "与本地同时区";
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const span = m ? `${h} 小时 ${m} 分` : `${h} 小时`;
  return diff > 0 ? `比本地早 ${span}` : `比本地晚 ${span}`;
}

// ====== 组件 ======

export function WorldClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const localTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );
  const localOffsetMin = -now.getTimezoneOffset();

  // 本地时区放首卡；若本地就在城市列表里则去重，避免出现两张相同的卡
  const zones = useMemo<
    { name: string; country?: string; capital?: string; tz: string; isLocal: boolean }[]
  >(() => {
    return [
      { name: "本地时间", tz: localTz, isLocal: true },
      ...CITIES.filter((c) => c.tz !== localTz).map((c) => ({
        ...c,
        isLocal: false,
      })),
    ];
  }, [localTz]);

  const localName =
    CITIES.find((c) => c.tz === localTz)?.name ?? localTz.split("/").pop()?.replace(/_/g, " ") ?? localTz;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          共 {zones.length} 个时区，每秒自动刷新
        </span>
        <span suppressHydrationWarning>{offsetLabel(localOffsetMin)} 为你所在的时区</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {zones.map(({ name, country, capital, tz, isLocal }) => {
          const t = zoneNow(tz, now);
          const offsetMin = tzOffsetMinutes(tz, now);
          return (
            <Card
              key={tz}
              className={cn(
                "p-4",
                isLocal && "border-primary/40 bg-primary/5",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-foreground">
                      {isLocal ? `本地时间 · ${localName}` : name}
                    </span>
                    {country && !isLocal && (
                      <span className="text-xs text-muted-foreground">
                        {country}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground/80">
                    {isLocal
                      ? tz
                      : capital
                        ? `首都：${capital}`
                        : "该国首都"}
                  </div>
                </div>
                {t.isDay ? (
                  <Sun className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-300" />
                )}
              </div>

              <div
                className="mt-2 font-mono text-3xl font-semibold tabular-nums text-foreground"
                suppressHydrationWarning
              >
                {t.time}
              </div>

              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span suppressHydrationWarning>
                  {t.date} {t.weekday}
                </span>
                <span className="font-mono" suppressHydrationWarning>
                  {offsetLabel(offsetMin)}
                </span>
              </div>

              {!isLocal && (
                <div className="mt-1 text-xs text-muted-foreground/80">
                  {diffLabel(offsetMin, localOffsetMin)}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
