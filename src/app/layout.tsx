import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  ),
  title: {
    template: "%s - moonTool",
    default: "moonTool - 免费在线工具网站大全",
  },
  description:
    "moonTool 提供 JSON 格式化、Base64 编解码、加密解密、调色板、二维码/条形码生成等免费在线工具，以及精选实用网站导航，全部免费使用，无需注册。",
  keywords: [
    "在线工具",
    "JSON格式化",
    "Base64编解码",
    "加密解密",
    "调色板",
    "二维码生成",
    "条形码生成",
    "网站导航",
    "免费工具",
  ],
  authors: [{ name: "moonTool" }],
  creator: "moonTool",
  publisher: "moonTool",
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "moonTool",
    title: "moonTool - 免费在线工具网站大全",
    description:
      "moonTool 提供 JSON 格式化、Base64 编解码、加密解密、调色板、二维码/条形码生成等免费在线工具，以及精选实用网站导航，全部免费使用，无需注册。",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "moonTool - 免费在线工具网站大全",
    description:
      "moonTool 提供 JSON 格式化、Base64 编解码、加密解密、调色板、二维码/条形码生成等免费在线工具，以及精选实用网站导航，全部免费使用，无需注册。",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
