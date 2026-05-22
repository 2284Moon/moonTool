import type { Metadata } from "next";
import { SiteGrid } from "@/components/SiteGrid";
import { JsonLd } from "@/components/JsonLd";
import { SectionHeader } from "@/components/SectionHeader";

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
        <SectionHeader
          title="网站一览"
          subtitle="精选实用网站导航，输入关键词快速查找"
          searchPlaceholder="搜索网站名称或描述..."
        />
        <SiteGrid />
      </section>
    </>
  );
}
