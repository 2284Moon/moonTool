"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Monitor,
  Cpu,
  HardDrive,
  Battery,
  Wifi,
  MapPin,
  ScreenShare,
  RefreshCw,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Info,
} from "lucide-react";

interface SystemInfo {
  // Network
  ip: string;
  ipLocation: string;
  isp: string;
  networkType: string;
  effectiveType: string;
  downlink: string;
  rtt: string;
  saveData: boolean;

  // Browser
  browser: string;
  browserVersion: string;
  engine: string;
  userAgent: string;
  language: string;
  languages: string[];
  cookiesEnabled: boolean;
  doNotTrack: string | null;
  online: boolean;

  // OS
  os: string;
  osVersion: string;
  platform: string;

  // Screen
  screenWidth: number;
  screenHeight: number;
  screenAvailWidth: number;
  screenAvailHeight: number;
  colorDepth: number;
  pixelRatio: number;
  orientation: string;
  touchSupport: boolean;

  // Hardware
  cpuCores: number;
  deviceMemory: string;
  maxTouchPoints: number;
  batteryLevel: string;
  batteryCharging: string;

  // Performance
  memoryUsed: string;
  memoryTotal: string;
  memoryLimit: string;
  downloadSpeed: string;
  speedTestStatus: string;
}

const DEFAULT_INFO: SystemInfo = {
  ip: "检测中...",
  ipLocation: "检测中...",
  isp: "检测中...",
  networkType: "检测中...",
  effectiveType: "检测中...",
  downlink: "检测中...",
  rtt: "检测中...",
  saveData: false,
  browser: "检测中...",
  browserVersion: "检测中...",
  engine: "检测中...",
  userAgent: "",
  language: "",
  languages: [],
  cookiesEnabled: false,
  doNotTrack: null,
  online: true,
  os: "检测中...",
  osVersion: "检测中...",
  platform: "",
  screenWidth: 0,
  screenHeight: 0,
  screenAvailWidth: 0,
  screenAvailHeight: 0,
  colorDepth: 0,
  pixelRatio: 0,
  orientation: "",
  touchSupport: false,
  cpuCores: 0,
  deviceMemory: "检测中...",
  maxTouchPoints: 0,
  batteryLevel: "检测中...",
  batteryCharging: "检测中...",
  memoryUsed: "检测中...",
  memoryTotal: "检测中...",
  memoryLimit: "检测中...",
  downloadSpeed: "点击测试",
  speedTestStatus: "idle",
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const parseUserAgent = (ua: string) => {
  const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)\/?\s*(\d+)/i);
  const osMatch = ua.match(/(Windows NT|Mac OS X|Linux|Android|iOS|iPhone|iPad)\s*([\d._]+)?/i);

  let browser = browserMatch?.[1] || "Unknown";
  let version = browserMatch?.[2] || "";
  let os = osMatch?.[1] || "Unknown";
  let osVersion = osMatch?.[2]?.replace(/_/g, ".") || "";

  // Normalize browser names
  if (browser === "Trident" || browser === "MSIE") {
    browser = "Internet Explorer";
    const ieMatch = ua.match(/rv:(\d+)/);
    version = ieMatch?.[1] || version;
  }
  if (ua.includes("Edg/")) browser = "Edge";
  if (ua.includes("OPR/")) browser = "Opera";

  // Normalize OS names
  if (os === "Windows NT") {
    const ntVersion: Record<string, string> = {
      "10.0": "10/11",
      "6.3": "8.1",
      "6.2": "8",
      "6.1": "7",
      "6.0": "Vista",
      "5.1": "XP",
    };
    os = "Windows";
    osVersion = ntVersion[osVersion] || osVersion;
  }
  if (os === "Mac OS X") os = "macOS";

  return { browser, version, os, osVersion };
};

export function SystemInfo() {
  const [info, setInfo] = useState<SystemInfo>(DEFAULT_INFO);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    network: true,
    browser: true,
    screen: true,
    hardware: true,
    performance: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const fetchIPInfo = useCallback(async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      setInfo((prev) => ({
        ...prev,
        ip: data.ip || "获取失败",
        ipLocation: `${data.country_name || ""} ${data.region || ""} ${data.city || ""}`.trim() || "获取失败",
        isp: data.org || "获取失败",
      }));
    } catch {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        setInfo((prev) => ({
          ...prev,
          ip: data.ip || "获取失败",
          ipLocation: "需要 VPN 或代理支持",
          isp: "需要 VPN 或代理支持",
        }));
      } catch {
        setInfo((prev) => ({
          ...prev,
          ip: "获取失败",
          ipLocation: "获取失败",
          isp: "获取失败",
        }));
      }
    }
  }, []);

  const fetchNetworkInfo = useCallback(() => {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      setInfo((prev) => ({
        ...prev,
        networkType: conn.type || "未知",
        effectiveType: conn.effectiveType?.toUpperCase() || "未知",
        downlink: conn.downlink ? `${conn.downlink} Mbps` : "未知",
        rtt: conn.rtt ? `${conn.rtt} ms` : "未知",
        saveData: conn.saveData || false,
      }));
    } else {
      setInfo((prev) => ({
        ...prev,
        networkType: "API 不可用",
        effectiveType: "API 不可用",
        downlink: "API 不可用",
        rtt: "API 不可用",
      }));
    }
  }, []);

  const fetchBrowserInfo = useCallback(() => {
    const ua = navigator.userAgent;
    const { browser, version, os, osVersion } = parseUserAgent(ua);

    let engine = "Unknown";
    if (ua.includes("Gecko")) engine = "Gecko";
    if (ua.includes("AppleWebKit")) engine = "WebKit/Blink";
    if (ua.includes("Trident")) engine = "Trident";

    setInfo((prev) => ({
      ...prev,
      browser,
      browserVersion: version,
      engine,
      userAgent: ua,
      language: navigator.language,
      languages: Array.from(navigator.languages || []),
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      online: navigator.onLine,
      os,
      osVersion,
      platform: navigator.platform,
    }));
  }, []);

  const fetchScreenInfo = useCallback(() => {
    const orientation = screen.orientation?.type || (window.innerWidth > window.innerHeight ? "landscape-primary" : "portrait-primary");
    const touchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    setInfo((prev) => ({
      ...prev,
      screenWidth: screen.width,
      screenHeight: screen.height,
      screenAvailWidth: screen.availWidth,
      screenAvailHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      orientation,
      touchSupport,
    }));
  }, []);

  const fetchHardwareInfo = useCallback(async () => {
    const cores = navigator.hardwareConcurrency || 0;
    const memory = (navigator as any).deviceMemory;
    const maxTouch = navigator.maxTouchPoints || 0;

    setInfo((prev) => ({
      ...prev,
      cpuCores: cores,
      deviceMemory: memory ? `${memory} GB` : "API 不可用",
      maxTouchPoints: maxTouch,
    }));

    // Battery API
    try {
      if ("getBattery" in navigator) {
        const battery = await (navigator as any).getBattery();
        const updateBattery = () => {
          setInfo((prev) => ({
            ...prev,
            batteryLevel: `${Math.round(battery.level * 100)}%`,
            batteryCharging: battery.charging ? "充电中" : "未充电",
          }));
        };
        updateBattery();
        battery.addEventListener("levelchange", updateBattery);
        battery.addEventListener("chargingchange", updateBattery);
      } else {
        setInfo((prev) => ({
          ...prev,
          batteryLevel: "API 不可用",
          batteryCharging: "API 不可用",
        }));
      }
    } catch {
      setInfo((prev) => ({
        ...prev,
        batteryLevel: "API 不可用",
        batteryCharging: "API 不可用",
      }));
    }
  }, []);

  const fetchPerformanceInfo = useCallback(() => {
    if (performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      setInfo((prev) => ({
        ...prev,
        memoryUsed: formatBytes(memory.usedJSHeapSize),
        memoryTotal: formatBytes(memory.totalJSHeapSize),
        memoryLimit: formatBytes(memory.jsHeapSizeLimit),
      }));
    } else {
      setInfo((prev) => ({
        ...prev,
        memoryUsed: "API 不可用",
        memoryTotal: "API 不可用",
        memoryLimit: "API 不可用",
      }));
    }
  }, []);

  const testDownloadSpeed = useCallback(async () => {
    setInfo((prev) => ({ ...prev, speedTestStatus: "testing", downloadSpeed: "测试中..." }));

    try {
      // Use a small image for speed test
      const testUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/200px-PNG_transparency_demonstration_1.png";
      const startTime = performance.now();

      const response = await fetch(testUrl + "?t=" + Date.now(), { cache: "no-store" });
      const blob = await response.blob();

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const sizeInBits = blob.size * 8;
      const speedBps = sizeInBits / duration;
      const speedMbps = (speedBps / (1024 * 1024)).toFixed(2);

      setInfo((prev) => ({
        ...prev,
        downloadSpeed: `${speedMbps} Mbps`,
        speedTestStatus: "done",
      }));
    } catch {
      setInfo((prev) => ({
        ...prev,
        downloadSpeed: "测试失败",
        speedTestStatus: "error",
      }));
    }
  }, []);

  const refreshAll = useCallback(() => {
    setInfo(DEFAULT_INFO);
    fetchIPInfo();
    fetchNetworkInfo();
    fetchBrowserInfo();
    fetchScreenInfo();
    fetchHardwareInfo();
    fetchPerformanceInfo();
  }, [fetchIPInfo, fetchNetworkInfo, fetchBrowserInfo, fetchScreenInfo, fetchHardwareInfo, fetchPerformanceInfo]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setInfo((prev) => ({ ...prev, online: true }));
    const handleOffline = () => setInfo((prev) => ({ ...prev, online: false }));
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const StatusBadge = ({ value, trueText, falseText }: { value: boolean; trueText: string; falseText: string }) => (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${value ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
      {value ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {value ? trueText : falseText}
    </span>
  );

  const InfoRow = ({ label, value, icon }: { label: string; value: string | number | boolean; icon?: React.ReactNode }) => (
    <div className="flex items-center justify-between border-b py-2.5 last:border-b-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium text-right max-w-[60%] break-all">
        {typeof value === "boolean" ? (
          <StatusBadge value={value} trueText="是" falseText="否" />
        ) : (
          String(value) || "-"
        )}
      </div>
    </div>
  );

  const SectionCard = ({
    title,
    icon,
    section,
    children,
  }: {
    title: string;
    icon: React.ReactNode;
    section: string;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections[section];
    return (
      <Card className="overflow-hidden border-2 py-0">
        <button
          onClick={() => toggleSection(section)}
          className="flex w-full items-center justify-between bg-muted/30 px-4 py-3 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {isExpanded && <div className="p-4">{children}</div>}
      </Card>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <Card className="overflow-hidden border-2 py-0">
        <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">系统信息检测</h2>
                <p className="text-sm text-muted-foreground">
                  纯前端检测，探索浏览器赋予的底层硬件和系统交互能力
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refreshAll}>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Network Info */}
        <SectionCard title="网络信息" icon={<Globe className="h-4 w-4 text-blue-500" />} section="network">
          <div className="space-y-1">
            <InfoRow label="IP 地址" value={info.ip} icon={<Globe className="h-3.5 w-3.5" />} />
            <InfoRow label="IP 归属地" value={info.ipLocation} icon={<MapPin className="h-3.5 w-3.5" />} />
            <InfoRow label="ISP 运营商" value={info.isp} icon={<Wifi className="h-3.5 w-3.5" />} />
            <InfoRow label="网络类型" value={info.networkType} icon={<Wifi className="h-3.5 w-3.5" />} />
            <InfoRow label="有效连接类型" value={info.effectiveType} icon={<Zap className="h-3.5 w-3.5" />} />
            <InfoRow label="下行速度" value={info.downlink} icon={<Zap className="h-3.5 w-3.5" />} />
            <InfoRow label="网络延迟 (RTT)" value={info.rtt} icon={<Zap className="h-3.5 w-3.5" />} />
            <InfoRow label="省流量模式" value={info.saveData} icon={<Zap className="h-3.5 w-3.5" />} />
            <InfoRow label="在线状态" value={info.online} icon={<Wifi className="h-3.5 w-3.5" />} />

            {/* Speed Test */}
            <div className="mt-4 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">下载速度测试</p>
                  <p className="text-xs text-muted-foreground">通过下载测试图片估算</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{info.downloadSpeed}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={testDownloadSpeed}
                    disabled={info.speedTestStatus === "testing"}
                  >
                    {info.speedTestStatus === "testing" ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="mr-1 h-3 w-3" />
                    )}
                    {info.speedTestStatus === "testing" ? "测试中" : "开始测试"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Browser Info */}
        <SectionCard title="浏览器信息" icon={<Monitor className="h-4 w-4 text-purple-500" />} section="browser">
          <div className="space-y-1">
            <InfoRow label="浏览器" value={info.browser} icon={<Monitor className="h-3.5 w-3.5" />} />
            <InfoRow label="版本" value={info.browserVersion} icon={<Info className="h-3.5 w-3.5" />} />
            <InfoRow label="渲染引擎" value={info.engine} icon={<Cpu className="h-3.5 w-3.5" />} />
            <InfoRow label="操作系统" value={`${info.os} ${info.osVersion}`} icon={<Monitor className="h-3.5 w-3.5" />} />
            <InfoRow label="平台" value={info.platform} icon={<Monitor className="h-3.5 w-3.5" />} />
            <InfoRow label="语言" value={info.language} icon={<Globe className="h-3.5 w-3.5" />} />
            <InfoRow label="Cookie" value={info.cookiesEnabled} icon={<Info className="h-3.5 w-3.5" />} />
            <InfoRow label="Do Not Track" value={info.doNotTrack || "未启用"} icon={<Info className="h-3.5 w-3.5" />} />

            {/* Languages List */}
            {info.languages.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">支持的语言列表</p>
                <div className="flex flex-wrap gap-1.5">
                  {info.languages.map((lang) => (
                    <span key={lang} className="rounded-md bg-muted px-2 py-1 text-xs font-mono">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* User Agent */}
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">User Agent</p>
              <p className="rounded-md bg-muted p-3 text-xs font-mono break-all">{info.userAgent || "-"}</p>
            </div>
          </div>
        </SectionCard>

        {/* Screen Info */}
        <SectionCard title="屏幕信息" icon={<ScreenShare className="h-4 w-4 text-green-500" />} section="screen">
          <div className="space-y-1">
            <InfoRow label="屏幕分辨率" value={`${info.screenWidth} × ${info.screenHeight}`} icon={<ScreenShare className="h-3.5 w-3.5" />} />
            <InfoRow label="可用分辨率" value={`${info.screenAvailWidth} × ${info.screenAvailHeight}`} icon={<ScreenShare className="h-3.5 w-3.5" />} />
            <InfoRow label="窗口大小" value={`${window.innerWidth} × ${window.innerHeight}`} icon={<Monitor className="h-3.5 w-3.5" />} />
            <InfoRow label="色彩深度" value={`${info.colorDepth} bit`} icon={<Info className="h-3.5 w-3.5" />} />
            <InfoRow label="设备像素比" value={`${info.pixelRatio}x`} icon={<Info className="h-3.5 w-3.5" />} />
            <InfoRow label="屏幕方向" value={info.orientation} icon={<Info className="h-3.5 w-3.5" />} />
            <InfoRow label="触控支持" value={info.touchSupport} icon={<Info className="h-3.5 w-3.5" />} />
          </div>
        </SectionCard>

        {/* Hardware Info */}
        <SectionCard title="硬件信息" icon={<Cpu className="h-4 w-4 text-orange-500" />} section="hardware">
          <div className="space-y-1">
            <InfoRow label="CPU 核心数" value={info.cpuCores || "-"} icon={<Cpu className="h-3.5 w-3.5" />} />
            <InfoRow label="设备内存" value={info.deviceMemory} icon={<HardDrive className="h-3.5 w-3.5" />} />
            <InfoRow label="最大触控点" value={info.maxTouchPoints} icon={<Info className="h-3.5 w-3.5" />} />
            <InfoRow label="电池电量" value={info.batteryLevel} icon={<Battery className="h-3.5 w-3.5" />} />
            <InfoRow label="充电状态" value={info.batteryCharging} icon={<Battery className="h-3.5 w-3.5" />} />
          </div>
        </SectionCard>

        {/* Performance Info */}
        <SectionCard title="性能信息" icon={<Zap className="h-4 w-4 text-yellow-500" />} section="performance">
          <div className="space-y-1">
            <InfoRow label="JS 堆已用" value={info.memoryUsed} icon={<HardDrive className="h-3.5 w-3.5" />} />
            <InfoRow label="JS 堆总量" value={info.memoryTotal} icon={<HardDrive className="h-3.5 w-3.5" />} />
            <InfoRow label="JS 堆限制" value={info.memoryLimit} icon={<HardDrive className="h-3.5 w-3.5" />} />

            {/* Performance Entries */}
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">页面加载性能</p>
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2 text-xs">
                {(() => {
                  const perf = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
                  if (!perf) return <p className="text-muted-foreground">API 不可用</p>;
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">DNS 查询</span>
                        <span className="font-mono">{(perf.domainLookupEnd - perf.domainLookupStart).toFixed(0)} ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">TCP 连接</span>
                        <span className="font-mono">{(perf.connectEnd - perf.connectStart).toFixed(0)} ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">请求响应</span>
                        <span className="font-mono">{(perf.responseEnd - perf.requestStart).toFixed(0)} ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">DOM 解析</span>
                        <span className="font-mono">{(perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart).toFixed(0)} ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">页面完全加载</span>
                        <span className="font-mono">{(perf.loadEventEnd - perf.startTime).toFixed(0)} ms</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* API Support */}
        <SectionCard title="浏览器 API 支持" icon={<Check className="h-4 w-4 text-teal-500" />} section="api">
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: "Battery API", check: () => "getBattery" in navigator },
              { name: "Network Info API", check: () => "connection" in navigator },
              { name: "Device Memory", check: () => "deviceMemory" in navigator },
              { name: "Hardware Concurrency", check: () => "hardwareConcurrency" in navigator },
              { name: "Touch Events", check: () => "ontouchstart" in window },
              { name: "Geolocation", check: () => "geolocation" in navigator },
              { name: "Clipboard API", check: () => "clipboard" in navigator },
              { name: "Notifications", check: () => "Notification" in window },
              { name: "Service Worker", check: () => "serviceWorker" in navigator },
              { name: "Web Bluetooth", check: () => "bluetooth" in navigator },
              { name: "Web USB", check: () => "usb" in navigator },
              { name: "Gamepad API", check: () => "getGamepads" in navigator },
              { name: "Screen Wake Lock", check: () => "wakeLock" in navigator },
              { name: "Web Share", check: () => "share" in navigator },
              { name: "Web XR", check: () => "xr" in navigator },
              { name: "IndexedDB", check: () => "indexedDB" in window },
              { name: "WebGL", check: () => !!document.createElement("canvas").getContext("webgl") },
              { name: "WebGPU", check: () => "gpu" in navigator },
              { name: "WebSocket", check: () => "WebSocket" in window },
              { name: "WebRTC", check: () => "RTCPeerConnection" in window },
            ].map((api) => {
              let supported = false;
              try {
                supported = api.check();
              } catch {
                supported = false;
              }
              return (
                <div
                  key={api.name}
                  className={`flex items-center gap-2 rounded-md border p-2 text-xs ${
                    supported ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                  }`}
                >
                  {supported ? (
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  )}
                  <span className="truncate">{api.name}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Tips */}
      <Card className="border-2 py-0">
        <div className="flex flex-wrap items-center gap-6 px-6 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-blue-500" />
            <span>所有信息在浏览器本地获取，不会上传到服务器</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-yellow-500" />
            <span>部分 API 需要浏览器支持或用户授权</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
