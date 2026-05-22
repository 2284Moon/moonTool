"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { useState } from "react";

interface AddSiteDialogProps {
  onAdded: () => void;
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
        setError(data.error || "添加失败");
        return;
      }

      setName("");
      setUrl("");
      setDescription("");
      setIcon("🌐");
      setTags("");
      setOpen(false);
      onAdded();
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
                  {error}
                </p>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? "添加中..." : "添加"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
