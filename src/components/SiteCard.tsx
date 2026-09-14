"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { getFaviconCandidates } from "@/util/favicon";
import type { Site } from "@/types";

function safeHostname(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return rawUrl;
  }
}

interface SiteCardProps {
  site: Site;
  index?: number;
  onDelete?: (id: string) => void;
}

export function SiteCard({ site, index = 0, onDelete }: SiteCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const candidates = getFaviconCandidates(site.url, 64);
  const favicon = candidates[attempt];
  const showFavicon = candidates.length > 0 && attempt < candidates.length;

  // 超时降级：某些图源（如被墙的 Google）请求会一直挂起而不触发 onError，
  // 因此加一个计时器——指定时间内未加载成功就切换到下一个候选源。
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!showFavicon) return;
    timerRef.current = setTimeout(() => setAttempt((a) => a + 1), 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [attempt, showFavicon]);

  const handleFaviconLoad = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleDelete = async (secretKey: string) => {
    const res = await fetch(`/api/sites?id=${site.id}`, {
      method: "DELETE",
      headers: { "x-delete-key": secretKey },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "删除失败");
    setShowDeleteDialog(false);
    onDelete?.(site.id);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
        whileHover={{ y: -6, transition: { type: "spring", stiffness: 500, damping: 30 } }}
        className="group relative"
      >
        {/* 仅用户添加的站点显示删除按钮；常驻站点不显示 */}
        {onDelete && site.userAdded && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: deleting ? 0.5 : 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteDialog(true); }}
            disabled={deleting}
            className="absolute -right-1.5 -top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
            aria-label={`删除${site.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </motion.button>
        )}
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-full"
        >
          <Card size="sm" className="group/card h-full cursor-pointer border border-border/40 bg-card/50 backdrop-blur-sm transition-colors hover:border-primary/20 hover:bg-card hover:shadow-md">
            <CardContent className="flex flex-col gap-1 p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <motion.span
                    className="flex h-5 w-5 items-center justify-center overflow-hidden text-xl"
                    whileHover={{ rotate: [0, -15, 15, -10, 0] }}
                    transition={{ duration: 0.4 }}
                  >
                    {showFavicon ? (
                      <img
                        src={favicon}
                        alt={site.name}
                        width={20}
                        height={20}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-5 w-5 rounded-sm object-contain"
                        onLoad={handleFaviconLoad}
                        onError={() => setAttempt((a) => a + 1)}
                      />
                    ) : (
                      <span>{site.icon}</span>
                    )}
                  </motion.span>
                  <h3 className="text-base font-semibold leading-tight text-foreground">{site.name}</h3>
                </div>
                <motion.div
                  whileHover={{ x: 2, y: -2 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground" />
                </motion.div>
              </div>
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {site.description}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {safeHostname(site.url)}
              </p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {site.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="px-1.5 py-0.5 text-xs font-medium">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </a>
      </motion.div>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        siteName={site.name}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
