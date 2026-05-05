import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { tools } from "@/data/tools";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { JsonLd } from "@/components/JsonLd";
import { JsonFormatter } from "@/tools/json-formatter";
import { Base64Encoder } from "@/tools/base64-encoder";
import { ColorPalette } from "@/tools/color-palette";
import { CryptoTool } from "@/tools/crypto-tool";
import { CodeGenerator } from "@/tools/code-generator";

interface ToolDetailPageProps {
  params: Promise<{ toolId: string }>;
}

export function generateStaticParams() {
  return tools.map((tool) => ({ toolId: tool.id }));
}

export async function generateMetadata({
  params,
}: ToolDetailPageProps): Promise<Metadata> {
  const { toolId } = await params;
  const tool = tools.find((t) => t.id === toolId);
  if (!tool) {
    return {
      title: "工具未找到",
      robots: { index: false, follow: false },
    };
  }

  const title = `${tool.name} - 免费在线${tool.name}工具`;
  const url = `/tools/${tool.id}`;

  return {
    title: tool.name,
    description: tool.description,
    keywords: [...tool.tags, "在线工具", tool.name, "免费"],
    alternates: { canonical: url },
    openGraph: {
      title,
      description: tool.description,
      url,
    },
    twitter: {
      card: "summary",
      title,
      description: tool.description,
    },
  };
}

export default async function ToolDetailPage({ params }: ToolDetailPageProps) {
  const { toolId } = await params;
  const tool = tools.find((t) => t.id === toolId);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  if (!tool) {
    notFound();
  }

  const renderToolComponent = () => {
    switch (toolId) {
      case "json-formatter":
        return <JsonFormatter />;
      case "base64-encoder":
        return <Base64Encoder />;
      case "color-palette":
        return <ColorPalette />;
      case "crypto-tool":
        return <CryptoTool />;
      case "code-generator":
        return <CodeGenerator />;
      default:
        return (
          <div className="rounded-lg border bg-muted/50 p-12 text-center text-muted-foreground">
            <p className="text-lg">工具功能开发中...</p>
            <p className="mt-2 text-sm">
              工具 <strong>{tool.name}</strong> 的具体功能将在后续迭代中实现。
            </p>
          </div>
        );
    }
  };

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
            {
              "@type": "ListItem",
              position: 3,
              name: tool.name,
              item: baseUrl + "/tools/" + tool.id,
            },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: tool.name + " - moonTool",
          applicationCategory: "UtilityApplication",
          description: tool.description,
          url: baseUrl + "/tools/" + tool.id,
          operatingSystem: "All",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "CNY",
          },
          inLanguage: "zh-CN",
          browserRequirements: "Requires JavaScript",
        }}
      />
      <section className="mx-auto w-full max-w-7xl px-4 py-4">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/" />}>
                首页
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/tools" />}>
                工具一览
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{tool.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">
          {tool.name} - 免费在线{tool.name}工具
        </h1>

        {renderToolComponent()}
      </section>
    </>
  );
}
