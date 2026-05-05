"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tool } from "@/types";

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Link href={`/tools/${tool.id}`}>
        <Card className="group h-full cursor-pointer border border-border/40 bg-card/50 backdrop-blur-sm transition-all hover:border-border hover:bg-card hover:shadow-md">
          <CardContent className="flex flex-col gap-1.5 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xl transition-transform group-hover:scale-110">{tool.icon}</span>
              <h3 className="text-sm font-semibold leading-tight text-foreground">{tool.name}</h3>
            </div>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {tool.description}
            </p>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {tool.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="px-1.5 py-0.5 text-[10px] font-medium">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
