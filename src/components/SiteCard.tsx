"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { Site } from "@/types";

interface SiteCardProps {
  site: Site;
}

export function SiteCard({ site }: SiteCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className="h-full border transition-shadow hover:shadow-lg">
        <CardContent className="flex flex-col gap-3 p-6">
          <span className="text-3xl">{site.icon}</span>
          <h3 className="text-lg font-semibold">{site.name}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {site.description}
          </p>
          <p className="text-xs text-muted-foreground">
            {new URL(site.url).hostname}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
            {site.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              render={
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  访问
                </a>
              }
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
