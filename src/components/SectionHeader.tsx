"use client";

import { SearchInput } from "@/components/SearchInput";
import { motion } from "framer-motion";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
}

export function SectionHeader({ title, subtitle, searchPlaceholder }: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mb-6 flex flex-col items-center gap-2.5 text-center"
    >
      <motion.h1
        className="text-2xl font-bold tracking-tight text-foreground"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {subtitle}
        </motion.p>
      )}
      {searchPlaceholder && (
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <SearchInput placeholder={searchPlaceholder} />
        </motion.div>
      )}
    </motion.div>
  );
}
