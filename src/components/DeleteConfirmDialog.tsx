"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DeleteConfirmDialogProps {
  open: boolean;
  siteName: string;
  onClose: () => void;
  onConfirm: (secretKey: string) => Promise<void>;
}

export function DeleteConfirmDialog({ open, siteName, onClose, onConfirm }: DeleteConfirmDialogProps) {
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!secretKey.trim()) {
      setError("请输入删除密钥");
      return;
    }
    setLoading(true);
    try {
      await onConfirm(secretKey);
      setSecretKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            className="relative z-10 w-full max-w-sm rounded-xl bg-card p-6 shadow-2xl ring-1 ring-foreground/10"
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-1 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-semibold">删除网站</h2>
                <p className="text-xs text-muted-foreground">此操作不可撤销</p>
              </div>
            </div>

            <p className="mb-4 mt-3 text-sm text-muted-foreground">
              确定要删除 <span className="font-medium text-foreground">{siteName}</span> 吗？请输入管理密钥确认。
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  type="password"
                  placeholder="请输入删除密钥"
                  className="pl-8"
                  autoFocus
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
                >
                  {error}
                </motion.p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  取消
                </Button>
                <Button type="submit" size="sm" variant="destructive" disabled={loading}>
                  {loading ? "删除中..." : "确认删除"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
