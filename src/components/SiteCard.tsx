"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import type { Site } from "@/types";

interface SiteCardProps {
  site: Site;
}

export function SiteCard({ site }: SiteCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <a
        href={site.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        <Card className="group h-full cursor-pointer border border-border/40 bg-card/50 backdrop-blur-sm transition-all hover:border-border hover:bg-card hover:shadow-md">
          <CardContent className="flex flex-col gap-1.5 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl transition-transform group-hover:scale-110">{site.icon}</span>
                <h3 className="text-sm font-semibold leading-tight text-foreground">{site.name}</h3>
              </div>
              <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground" />
            </div>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {site.description}
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              {new URL(site.url).hostname}
            </p>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {site.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="px-1.5 py-0.5 text-[10px] font-medium">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </a>
    </motion.div>
  );
}
