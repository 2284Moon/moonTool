"use client";

import { useMemo } from "react";
import { useSearchStore } from "@/store/useSearchStore";
import { tools } from "@/data/tools";
import { fuzzyMatch } from "@/util/search";
import { ToolCard } from "./ToolCard";

export function ToolGrid() {
  const query = useSearchStore((s) => s.query);

  const filtered = useMemo(() => {
    if (!query.trim()) return tools;
    return tools.filter(
      (t) => fuzzyMatch(t.name, query) || fuzzyMatch(t.description, query)
    );
  }, [query]);

  if (filtered.length === 0) {
    return (
      <p className="py-20 text-center text-muted-foreground">
        没有找到匹配的工具
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {filtered.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  );
}
