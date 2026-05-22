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
        <AddSiteDialog onAdded={fetchSites} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <AddSiteDialog onAdded={fetchSites} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((site, i) => (
          <SiteCard key={site.id} site={site} index={i} onDelete={fetchSites} />
        ))}
      </div>
    </div>
  );
}
