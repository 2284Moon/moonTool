"use client";

import { useMemo } from "react";
import { useSearchStore } from "@/store/useSearchStore";
import { sites } from "@/data/sites";
import { fuzzyMatch } from "@/util/search";
import { SiteCard } from "./SiteCard";

export function SiteGrid() {
  const query = useSearchStore((s) => s.query);

  const filtered = useMemo(() => {
    if (!query.trim()) return sites;
    return sites.filter(
      (s) => fuzzyMatch(s.name, query) || fuzzyMatch(s.description, query)
    );
  }, [query]);

  if (filtered.length === 0) {
    return (
      <p className="py-20 text-center text-muted-foreground">
        没有找到匹配的网站
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {filtered.map((site) => (
        <SiteCard key={site.id} site={site} />
      ))}
    </div>
  );
}
