"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Site } from "@/types";

interface AddSiteDialogProps {
  /** API 成功后拿新站点对象回调，父组件直接插本地 state，无需重新拉数据 */
  onAdded: (newSite: Site) => void;
}

export function AddSiteDialog({ onAdded }: AddSiteDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🌐");
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 倒计时每 1 秒减 1，到 0 自动清除
  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          description,
          icon,
          tags: tags
            .split(/[,，]/)
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 429 速率限制 → 解析倒计时秒数，启动实时倒数
        if (res.status === 429) {
          const match = data.error?.match(/(\d+)\s*秒/);
          const seconds = match ? parseInt(match[1], 10) : 0;
          if (seconds > 0) {
            setCooldown(seconds);
            setError(data.error);
            return;
          }
        }
        setError(data.error || "添加失败");
        return;
      }

      setName("");
      setUrl("");
      setDescription("");
      setIcon("🌐");
      setTags("");
      setCooldown(0);
      setOpen(false);
      onAdded(data);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button className="cursor-pointer" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        添加网站
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-card p-6 shadow-2xl ring-1 ring-foreground/10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">添加网站</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">名称 *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如: My Site"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">网址 *</label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="例如: https://example.com"
                  type="url"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">描述</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简短描述这个网站"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">图标 (emoji)</label>
                <Input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="🌐"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  标签（逗号分隔）
                </label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="例如: AI, 效率, 开发"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {cooldown > 0
                    ? `操作太频繁，请 ${cooldown} 秒后再试`
                    : error}
                </p>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setOpen(false); setCooldown(0); }}
                >
                  取消
                </Button>
                <Button type="submit" size="sm" disabled={loading || cooldown > 0}>
                  {loading ? "添加中..." : cooldown > 0 ? `请等待 ${cooldown}s` : "添加"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
