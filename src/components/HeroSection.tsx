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
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center gap-6"
      >
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          moonTool
        </h1>
        <p className="text-xl font-medium text-muted-foreground">
          工具网站大全
        </p>
        <p className="max-w-lg text-muted-foreground">
          {displayedText}
          <span className="animate-pulse">|</span>
        </p>
        <div className="flex flex-col gap-4 pt-4 sm:flex-row">
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
        </div>
      </motion.div>
    </section>
  );
}
