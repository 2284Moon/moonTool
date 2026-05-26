"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, FileDown, ImageDown, RotateCcw, Save } from "lucide-react";

const DB_NAME = "moonTool.local";
const DB_VERSION = 1;
const STORE_NAME = "markdown-documents";
const DOC_ID = "moonTool.markdown-editor.default";

interface SavedMarkdownDoc {
  id: string;
  site: "moonTool";
  tool: "markdown-editor";
  content: string;
  updatedAt: string;
}

const defaultMarkdown = `# Markdown 实时编辑器

左侧输入 Markdown，右侧会实时预览。

## 支持内容

- 标题、段落、引用
- **加粗**、*斜体*、\`行内代码\`
- 链接：[moonTool](https://example.com)
- 代码块

\`\`\`ts
const message = "Hello moonTool";
console.log(message);
\`\`\`

> 内容会自动保存到浏览器 IndexedDB，下次打开自动恢复。
`;

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("site_tool", ["site", "tool"], { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const loadDoc = async () => {
  const db = await openDb();
  return new Promise<SavedMarkdownDoc | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(DOC_ID);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
};

const saveDoc = async (content: string) => {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      id: DOC_ID,
      site: "moonTool",
      tool: "markdown-editor",
      content,
      updatedAt: new Date().toISOString(),
    } satisfies SavedMarkdownDoc);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const inlineMarkdown = (value: string) => {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return html;
};

const renderMarkdown = (markdown: string) => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let inCode = false;
  let inList = false;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!inList) return;
    html.push("</ul>");
    inList = false;
  };

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      flushParagraph();
      closeList();
      if (inCode) html.push("</code></pre>");
      else html.push("<pre><code>");
      inCode = !inCode;
      return;
    }

    if (inCode) {
      html.push(escapeHtml(line) + "\n");
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      return;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      return;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s?/, ""))}</blockquote>`);
      return;
    }

    const list = /^[-*]\s+(.+)$/.exec(line);
    if (list) {
      flushParagraph();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(list[1])}</li>`);
      return;
    }

    paragraph.push(line.trim());
  });

  flushParagraph();
  closeList();
  if (inCode) html.push("</code></pre>");
  return html.join("\n");
};

const downloadText = (content: string, filename: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export function MarkdownEditor() {
  const [markdown, setMarkdown] = useState(defaultMarkdown);
  const [status, setStatus] = useState("正在读取本地草稿...");
  const previewRef = useRef<HTMLDivElement>(null);
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);

  useEffect(() => {
    loadDoc()
      .then((doc) => {
        if (doc?.content) {
          setMarkdown(doc.content);
          setStatus(`已恢复上次草稿：${new Date(doc.updatedAt).toLocaleString()}`);
        } else {
          setStatus("暂无历史草稿，已载入示例文档");
        }
      })
      .catch(() => setStatus("当前浏览器无法读取 IndexedDB，自动保存不可用"));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveDoc(markdown)
        .then(() => setStatus(`已自动保存：${new Date().toLocaleTimeString()}`))
        .catch(() => setStatus("自动保存失败，请检查浏览器存储权限"));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [markdown]);

  const exportPdf = () => {
    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) return;
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>moonTool Markdown Export</title>
          <style>
            body { margin: 40px; color: #111827; font-family: Arial, "Microsoft YaHei", sans-serif; line-height: 1.7; }
            pre { background: #111827; color: #f9fafb; padding: 16px; border-radius: 8px; overflow: auto; }
            code { font-family: Consolas, monospace; }
            blockquote { margin-left: 0; padding-left: 16px; border-left: 4px solid #94a3b8; color: #475569; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const exportImage = async () => {
    const node = previewRef.current;
    if (!node) return;
    const width = Math.max(800, node.scrollWidth);
    const height = Math.max(600, node.scrollHeight);
    const markup = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:${width}px;min-height:${height}px;padding:32px;background:white;color:#111827;font-family:Arial,'Microsoft YaHei',sans-serif;line-height:1.7;">
            ${html}
          </div>
        </foreignObject>
      </svg>`;
    const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "markdown-preview.png";
        link.click();
      }, "image/png");
    };
    image.src = url;
  };

  return (
    <div className="w-full space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 border-2 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Save className="h-4 w-4" />
          <span>{status}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => downloadText(markdown, "document.md", "text/markdown;charset=utf-8")}>
            <Download className="mr-1 h-3.5 w-3.5" /> 导出 MD
          </Button>
          <Button size="sm" variant="outline" onClick={exportPdf}>
            <FileDown className="mr-1 h-3.5 w-3.5" /> 导出 PDF
          </Button>
          <Button size="sm" variant="outline" onClick={exportImage}>
            <ImageDown className="mr-1 h-3.5 w-3.5" /> 导出长图
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMarkdown(defaultMarkdown)}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> 重置
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex min-h-[680px] flex-col overflow-hidden border-2 border-dashed border-blue-500/30 py-0">
          <div className="border-b bg-muted/50 px-4 py-2">
            <h2 className="text-sm font-semibold">Markdown 文档</h2>
            <p className="text-xs text-muted-foreground">左侧编辑内容会自动保存到 moonTool.local / markdown-documents</p>
          </div>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            spellCheck={false}
            className="min-h-[620px] flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-6 outline-none"
          />
        </Card>

        <Card className="flex min-h-[680px] flex-col overflow-hidden border-2 border-dashed border-green-500/30 py-0">
          <div className="border-b bg-muted/50 px-4 py-2">
            <h2 className="text-sm font-semibold">HTML 预览</h2>
            <p className="text-xs text-muted-foreground">实时渲染，导出 PDF 时会打开打印窗口</p>
          </div>
          <div
            ref={previewRef}
            className="markdown-preview min-h-[620px] flex-1 overflow-auto bg-background p-6 text-sm leading-7"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </Card>
      </div>

      <style jsx global>{`
        .markdown-preview h1 { font-size: 2rem; line-height: 1.2; font-weight: 700; margin: 0 0 1rem; }
        .markdown-preview h2 { font-size: 1.5rem; line-height: 1.3; font-weight: 700; margin: 1.5rem 0 .75rem; }
        .markdown-preview h3 { font-size: 1.2rem; font-weight: 700; margin: 1.25rem 0 .5rem; }
        .markdown-preview p { margin: .75rem 0; }
        .markdown-preview ul { margin: .75rem 0; padding-left: 1.25rem; list-style: disc; }
        .markdown-preview blockquote { margin: 1rem 0; border-left: 4px solid hsl(var(--border)); padding-left: 1rem; color: hsl(var(--muted-foreground)); }
        .markdown-preview pre { margin: 1rem 0; overflow: auto; border-radius: .5rem; background: #111827; padding: 1rem; color: #f9fafb; }
        .markdown-preview code { border-radius: .25rem; background: hsl(var(--muted)); padding: .1rem .3rem; font-family: var(--font-geist-mono), monospace; }
        .markdown-preview pre code { background: transparent; padding: 0; }
        .markdown-preview a { color: #2563eb; text-decoration: underline; }
        .markdown-preview img { max-width: 100%; border-radius: .5rem; }
      `}</style>
    </div>
  );
}
