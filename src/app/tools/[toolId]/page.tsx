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
    return { title: "工具未找到 - moonTool" };
  }
  return {
    title: `${tool.name} - moonTool`,
    description: tool.description,
  };
}

export default async function ToolDetailPage({ params }: ToolDetailPageProps) {
  const { toolId } = await params;
  const tool = tools.find((t) => t.id === toolId);

  if (!tool) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <Breadcrumb className="mb-8">
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

      <div className="flex flex-col items-center gap-6 text-center">
        <span className="text-5xl">{tool.icon}</span>
        <h1 className="text-3xl font-bold tracking-tight">{tool.name}</h1>
        <p className="max-w-md text-muted-foreground">{tool.description}</p>
        <div className="rounded-lg border bg-muted/50 p-12 text-center text-muted-foreground">
          <p className="text-lg">工具功能开发中...</p>
          <p className="mt-2 text-sm">
            工具 <strong>{tool.name}</strong> 的具体功能将在后续迭代中实现。
          </p>
        </div>
      </div>
    </section>
  );
}
