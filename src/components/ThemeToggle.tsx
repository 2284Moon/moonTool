"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    document.documentElement.style.setProperty("--click-x", `${x}px`);
    document.documentElement.style.setProperty("--click-y", `${y}px`);

    if (document.startViewTransition) {
      document.startViewTransition(() => {
        document.documentElement.classList.toggle("dark");
        setDark((prev) => !prev);
      });
    } else {
      document.documentElement.classList.toggle("dark");
      setDark((prev) => !prev);
    }
  }, []);

  return (
    <Button
      ref={btnRef}
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="切换主题"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
