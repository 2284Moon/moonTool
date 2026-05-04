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
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Link href={`/tools/${tool.id}`}>
        <Card className="h-full cursor-pointer border transition-shadow hover:shadow-lg">
          <CardContent className="flex flex-col gap-3 p-6">
            <span className="text-3xl">{tool.icon}</span>
            <h3 className="text-lg font-semibold">{tool.name}</h3>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {tool.description}
            </p>
            <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
              {tool.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
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
