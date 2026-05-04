import type { Metadata } from "next";
import { SearchInput } from "@/components/SearchInput";
import { ToolGrid } from "@/components/ToolGrid";

export const metadata: Metadata = {
  title: "工具一览 - moonTool",
  description: "浏览 moonTool 提供的所有在线工具",
};

export default function ToolsPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight">工具一览</h1>
        <p className="text-muted-foreground">
          浏览所有在线工具，输入关键词快速查找
        </p>
        <SearchInput placeholder="搜索工具名称或描述..." />
      </div>
      <ToolGrid />
    </section>
  );
}
