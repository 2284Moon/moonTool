"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tool } from "@/types";

interface ToolCardProps {
  tool: Tool;
  index?: number;
}

export function ToolCard({ tool, index = 0 }: ToolCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -6, transition: { type: "spring", stiffness: 500, damping: 30 } }}
    >
      <Link href={`/tools/${tool.id}`}>
        <Card className="group h-full cursor-pointer border border-border/40 bg-card/50 backdrop-blur-sm transition-colors hover:border-primary/20 hover:bg-card hover:shadow-md">
          <CardContent className="flex flex-col gap-1.5 p-3">
            <div className="flex items-center gap-2">
              <motion.span
                className="text-xl"
                whileHover={{ rotate: [0, -15, 15, -10, 0] }}
                transition={{ duration: 0.4 }}
              >
                {tool.icon}
              </motion.span>
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
