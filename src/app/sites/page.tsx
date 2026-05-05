import type { Metadata } from "next";
import { SearchInput } from "@/components/SearchInput";
import { SiteGrid } from "@/components/SiteGrid";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "网站一览",
  description:
    "浏览 moonTool 精选的实用网站导航：设计工具、开发平台、AI 助手、效率工具等优质网站推荐。",
  keywords: [
    "网站导航",
    "实用网站",
    "设计工具",
    "开发平台",
    "AI助手",
    "效率工具",
    "网站推荐",
  ],
  alternates: {
    canonical: "/sites",
  },
  openGraph: {
    title: "网站一览 - moonTool",
    description:
      "浏览 moonTool 精选的实用网站导航：设计工具、开发平台、AI 助手、效率工具等优质网站推荐。",
    url: "/sites",
  },
};

export default function SitesPage() {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "首页",
              item: baseUrl,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "网站一览",
              item: baseUrl + "/sites",
            },
          ],
        }}
      />
      <section className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="mb-5 flex flex-col items-center gap-2.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            网站一览
          </h1>
          <p className="text-sm text-muted-foreground">
            精选实用网站导航，输入关键词快速查找
          </p>
          <div className="w-full max-w-md">
            <SearchInput placeholder="搜索网站名称或描述..." />
          </div>
        </div>
        <SiteGrid />
      </section>
    </>
  );
}
