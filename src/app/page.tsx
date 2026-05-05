import type { Metadata } from "next";
import { HeroSection } from "@/components/HeroSection";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "moonTool - 免费在线工具网站大全",
  description:
    "moonTool 提供 JSON 格式化、Base64 编解码、加密解密、调色板、二维码/条形码生成等免费在线工具，以及精选实用网站导航，全部免费使用，无需注册。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "moonTool - 免费在线工具网站大全",
    description:
      "moonTool 提供 JSON 格式化、Base64 编解码、加密解密、调色板、二维码/条形码生成等免费在线工具，以及精选实用网站导航，全部免费使用，无需注册。",
    url: "/",
  },
};

export default function Home() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "moonTool",
          alternateName: "moonTool - 工具网站大全",
          url: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
          description:
            "moonTool 提供 JSON 格式化、Base64 编解码、加密解密、调色板、二维码/条形码生成等免费在线工具，以及精选实用网站导航，全部免费使用，无需注册。",
          inLanguage: "zh-CN",
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate:
                (process.env.NEXT_PUBLIC_BASE_URL ||
                  "http://localhost:3000") + "/tools?search={search_term_string}",
            },
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <HeroSection />
    </>
  );
}
