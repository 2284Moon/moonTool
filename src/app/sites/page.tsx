import type { Metadata } from "next";
import { SearchInput } from "@/components/SearchInput";
import { SiteGrid } from "@/components/SiteGrid";

export const metadata: Metadata = {
  title: "网站一览 - moonTool",
  description: "浏览 moonTool 精选的网站导航",
};

export default function SitesPage() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-col items-center gap-2.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">网站一览</h1>
        <p className="text-sm text-muted-foreground">
          精选实用网站导航，输入关键词快速查找
        </p>
        <div className="w-full max-w-md">
          <SearchInput placeholder="搜索网站名称或描述..." />
        </div>
      </div>
      <SiteGrid />
    </section>
  );
}
