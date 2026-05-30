import type { Metadata } from "next";
import dynamic from "next/dynamic";
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

const JsonFormatter = dynamic(() => import("@/tools/json-formatter").then((m) => m.JsonFormatter));
const Base64Encoder = dynamic(() => import("@/tools/base64-encoder").then((m) => m.EncodingTools));
const ColorPalette = dynamic(() => import("@/tools/color-palette").then((m) => m.ColorPalette));
const CryptoTool = dynamic(() => import("@/tools/crypto-tool").then((m) => m.CryptoTool));
const CodeGenerator = dynamic(() => import("@/tools/code-generator").then((m) => m.CodeGenerator));
const RemoveLineBreaks = dynamic(() => import("@/tools/remove-line-breaks").then((m) => m.RemoveLineBreaks));
const ImageTool = dynamic(() => import("@/tools/image-tool").then((m) => m.ImageTool));
const ExifTool = dynamic(() => import("@/tools/exif-tool").then((m) => m.ExifTool));
const MarkdownEditor = dynamic(() => import("@/tools/markdown-editor").then((m) => m.MarkdownEditor));
const UuidGenerator = dynamic(() => import("@/tools/uuid-generator").then((m) => m.UuidGenerator));
const CurlConverter = dynamic(() => import("@/tools/curl-converter").then((m) => m.CurlConverter));
const HashCalculator = dynamic(() => import("@/tools/hash-calculator").then((m) => m.HashCalculator));
const CssGradient = dynamic(() => import("@/tools/css-gradient").then((m) => m.CssGradient));
const SvgCompressor = dynamic(() => import("@/tools/svg-compressor").then((m) => m.SvgCompressor));
const LoremIpsum = dynamic(() => import("@/tools/lorem-ipsum").then((m) => m.LoremIpsum));
const CronTool = dynamic(() => import("@/tools/cron-tool").then((m) => m.CronTool));
const RegexTester = dynamic(() => import("@/tools/regex-tester").then((m) => m.RegexTester));
const DiffChecker = dynamic(() => import("@/tools/diff-checker").then((m) => m.DiffChecker));
const TimestampConverter = dynamic(() => import("@/tools/timestamp-converter").then((m) => m.TimestampConverter));
const JwtDecoder = dynamic(() => import("@/tools/jwt-decoder").then((m) => m.JwtDecoder));
const ApiHealthChecker = dynamic(() => import("@/tools/api-health-checker").then((m) => m.ApiHealthChecker));

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
      case "remove-line-breaks":
        return <RemoveLineBreaks />;
      case "image-tool":
        return <ImageTool />;
      case "exif-tool":
        return <ExifTool />;
      case "markdown-editor":
        return <MarkdownEditor />;
      case "uuid-generator":
        return <UuidGenerator />;
      case "curl-converter":
        return <CurlConverter />;
      case "hash-calculator":
        return <HashCalculator />;
      case "css-gradient":
        return <CssGradient />;
      case "svg-compressor":
        return <SvgCompressor />;
      case "lorem-ipsum":
        return <LoremIpsum />;
      case "cron-tool":
        return <CronTool />;
      case "regex-tester":
        return <RegexTester />;
      case "diff-checker":
        return <DiffChecker />;
      case "timestamp-converter":
        return <TimestampConverter />;
      case "jwt-decoder":
        return <JwtDecoder />;
      case "api-health-checker":
        return <ApiHealthChecker />;
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
      <section className="mx-auto w-full max-w-7xl px-4 py-3">
        <Breadcrumb className="mb-2">
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

        <h1 className="mb-5 text-base font-medium tracking-tight text-foreground">
          <span className="font-semibold">{tool.name}</span>
          <span className="mx-2 text-muted-foreground/50">—</span>
          <span className="text-muted-foreground">{tool.description}</span>
        </h1>

        {renderToolComponent()}
      </section>
    </>
  );
}
