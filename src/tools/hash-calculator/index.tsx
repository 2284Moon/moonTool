"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, FileUp, Hash } from "lucide-react";
import CryptoJS from "crypto-js";

interface HashResult {
  md5: string;
  sha1: string;
  sha256: string;
}

const emptyResult: HashResult = { md5: "", sha1: "", sha256: "" };

const wordArrayFromBuffer = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i++) words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8);
  return CryptoJS.lib.WordArray.create(words, bytes.length);
};

export function HashCalculator() {
  const [text, setText] = useState("moonTool");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<HashResult>(emptyResult);
  const [progress, setProgress] = useState("");

  const hashText = () => {
    setFileName("");
    setResult({
      md5: CryptoJS.MD5(text).toString(),
      sha1: CryptoJS.SHA1(text).toString(),
      sha256: CryptoJS.SHA256(text).toString(),
    });
    setProgress("文本哈希已计算");
  };

  const hashFile = async (file: File) => {
    setFileName(file.name);
    setResult(emptyResult);
    const md5 = CryptoJS.algo.MD5.create();
    const sha1 = CryptoJS.algo.SHA1.create();
    const sha256 = CryptoJS.algo.SHA256.create();
    const chunkSize = 4 * 1024 * 1024;
    let offset = 0;

    while (offset < file.size) {
      const chunk = await file.slice(offset, offset + chunkSize).arrayBuffer();
      const words = wordArrayFromBuffer(chunk);
      md5.update(words);
      sha1.update(words);
      sha256.update(words);
      offset += chunkSize;
      setProgress(`文件处理中 ${Math.min(100, Math.round((offset / file.size) * 100))}%`);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    setResult({
      md5: md5.finalize().toString(),
      sha1: sha1.finalize().toString(),
      sha256: sha256.finalize().toString(),
    });
    setProgress("文件哈希已计算");
  };

  const rows = [
    ["MD5", result.md5],
    ["SHA-1", result.sha1],
    ["SHA-256", result.sha256],
  ];

  return (
    <div className="w-full space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden border-2 py-0">
          <div className="border-b bg-muted/50 px-4 py-2">
            <h2 className="text-sm font-semibold">文本哈希</h2>
            <p className="text-xs text-muted-foreground">输入任意文本，纯前端计算摘要</p>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="h-64 w-full resize-none bg-transparent p-4 font-mono text-sm outline-none" />
          <div className="border-t p-4">
            <Button size="sm" onClick={hashText}><Hash className="mr-1 h-3.5 w-3.5" /> 计算文本</Button>
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-blue-500/30 p-8">
          <FileUp className="h-10 w-10 text-muted-foreground/50" />
          <div className="text-center">
            <p className="text-sm font-medium">选择文件计算指纹</p>
            <p className="text-xs text-muted-foreground">大文件按 4MB 切片读取，不上传文件</p>
          </div>
          <input type="file" onChange={(e) => e.target.files?.[0] && hashFile(e.target.files[0])} className="text-sm" />
          {fileName && <p className="max-w-full truncate text-xs text-muted-foreground">{fileName}</p>}
        </Card>
      </div>

      <Card className="overflow-hidden border-2 py-0">
        <div className="border-b bg-muted/50 px-4 py-2">
          <h2 className="text-sm font-semibold">计算结果</h2>
          <p className="text-xs text-muted-foreground">{progress || "等待计算"}</p>
        </div>
        <div className="divide-y">
          {rows.map(([name, value]) => (
            <div key={name} className="grid gap-2 px-4 py-3 md:grid-cols-[120px_1fr_auto]">
              <span className="text-sm font-medium">{name}</span>
              <code className="break-all rounded bg-muted/40 px-2 py-1 text-xs">{value || "-"}</code>
              <Button size="sm" variant="ghost" disabled={!value} onClick={() => navigator.clipboard.writeText(value)}>
                <Copy className="mr-1 h-3.5 w-3.5" /> 复制
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
