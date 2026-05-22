"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const introText = "moonTool 提供各式各样的在线工具，以及精选的网站导航，全部免费使用，无需注册。";

export function HeroSection() {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < introText.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + introText[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  return (
    <section className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <motion.h1
          className="text-5xl font-bold tracking-tight sm:text-6xl drop-shadow-[0_0_12px_oklch(0.708_0_0/0.15)] dark:drop-shadow-[0_0_15px_oklch(0.8_0.1_85/0.3)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
        >
          moonTool
        </motion.h1>
        <motion.p
          className="text-xl font-medium text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          工具网站大全
        </motion.p>
        <motion.p
          className="max-w-lg text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {displayedText}
          <motion.span
            className="inline-block"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
          >|</motion.span>
        </motion.p>
        <motion.div
          className="flex flex-col gap-4 pt-4 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Button
            size="lg"
            className="group text-base"
            render={
              <Link href="/tools">
                所有工具一览
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            }
          />
          <Button
            variant="outline"
            size="lg"
            className="group text-base"
            render={
              <Link href="/sites">
                所有网站一览
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            }
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
