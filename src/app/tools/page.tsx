import type { Metadata } from "next";
import { SearchInput } from "@/components/SearchInput";
import { ToolGrid } from "@/components/ToolGrid";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "工具一览",
  description:
    "浏览 moonTool 提供的所有免费在线工具：JSON 格式化、Base64 编解码、加密解密、调色板、二维码/条形码生成器，全部免费使用，无需注册。",
  keywords: [
    "在线工具",
    "JSON格式化",
    "Base64编解码",
    "加密解密",
    "调色板",
    "二维码生成",
    "条形码生成",
    "免费工具",
  ],
  alternates: {
    canonical: "/tools",
  },
  openGraph: {
    title: "工具一览 - moonTool",
    description:
      "浏览 moonTool 提供的所有免费在线工具：JSON 格式化、Base64 编解码、加密解密、调色板、二维码/条形码生成器，全部免费使用，无需注册。",
    url: "/tools",
  },
};

export default function ToolsPage() {
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
              name: "工具一览",
              item: baseUrl + "/tools",
            },
          ],
        }}
      />
      <section className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="mb-5 flex flex-col items-center gap-2.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            工具一览
          </h1>
          <p className="text-sm text-muted-foreground">
            浏览所有在线工具，输入关键词快速查找
          </p>
          <div className="w-full max-w-md">
            <SearchInput placeholder="搜索工具名称或描述..." />
          </div>
        </div>
        <ToolGrid />
      </section>
    </>
  );
}
