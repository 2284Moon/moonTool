"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useSearchStore } from "@/store/useSearchStore";
import { fuzzyMatch } from "@/util/search";
import { SiteCard } from "./SiteCard";
import { AddSiteDialog } from "./AddSiteDialog";
import type { Site } from "@/types";

export function SiteGrid() {
  const query = useSearchStore((s) => s.query);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch("/api/sites");
      const data = await res.json();
      setSites(data);
    } catch {
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 新增成功后直接插本地 state，不重新拉数据（避免 Edge Config 写后读延迟） */
  const handleAdd = useCallback((newSite: Site) => {
    setSites((prev) => [newSite, ...prev]);
  }, []);

  /** 删除成功后直接从本地 state 移除 */
  const handleDelete = useCallback((id: string) => {
    setSites((prev) => prev.filter((s) => s.id !== id));
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const filtered = useMemo(() => {
    if (!query.trim()) return sites;
    return sites.filter(
      (s) =>
        fuzzyMatch(s.name, query) ||
        fuzzyMatch(s.description, query) ||
        s.tags.some((tag) => fuzzyMatch(tag, query))
    );
  }, [query, sites]);

  if (loading) {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-20 text-center text-muted-foreground"
      >
        加载中...
      </motion.p>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">没有找到匹配的网站</p>
        <AddSiteDialog onAdded={handleAdd} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddSiteDialog onAdded={handleAdd} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((site, i) => (
          <SiteCard key={site.id} site={site} index={i} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
