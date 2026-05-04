import type { Metadata } from "next";
import { SearchInput } from "@/components/SearchInput";
import { SiteGrid } from "@/components/SiteGrid";

export const metadata: Metadata = {
  title: "网站一览 - moonTool",
  description: "浏览 moonTool 精选的网站导航",
};

export default function SitesPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight">网站一览</h1>
        <p className="text-muted-foreground">
          精选实用网站导航，输入关键词快速查找
        </p>
        <SearchInput placeholder="搜索网站名称或描述..." />
      </div>
      <SiteGrid />
    </section>
  );
}
