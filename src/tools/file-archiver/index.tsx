"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Archive,
  ArchiveRestore,
  File,
  Folder,
  FolderOpen,
  Upload,
  Download,
  Trash2,
  X,
  FileArchive,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import * as fflate from "fflate";

type Mode = "compress" | "extract";

interface FileEntry {
  name: string;
  size: number;
  path: string;
  isDirectory: boolean;
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export function FileArchiver() {
  const [mode, setMode] = useState<Mode>("compress");
  const [files, setFiles] = useState<File[]>([]);
  const [extractedFiles, setExtractedFiles] = useState<{ name: string; data: Uint8Array; path: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFiles([]);
    setExtractedFiles([]);
    setProgress(0);
    setStatus("idle");
    setStatusMessage("");
  };

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFiles = Array.from(selectedFiles);
    setFiles((prev) => [...prev, ...newFiles]);
    setStatus("idle");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const compressFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setStatus("idle");

    try {
      const zipData: fflate.Zippable = {};

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        zipData[file.name] = uint8;
        setProgress(((i + 1) / files.length) * 50);
      }

      setProgress(60);
      const zipped = fflate.zipSync(zipData, { level: 6 });
      setProgress(90);

      const blob = new Blob([zipped], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `archive_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      setStatus("success");
      setStatusMessage(`已压缩 ${files.length} 个文件，大小 ${formatSize(blob.size)}`);
    } catch (error) {
      setStatus("error");
      setStatusMessage(`压缩失败: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const extractFile = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setStatus("idle");
    setExtractedFiles([]);

    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      setProgress(30);
      const unzipped = fflate.unzipSync(uint8);

      setProgress(60);
      const extracted: { name: string; data: Uint8Array; path: string }[] = [];

      for (const [path, data] of Object.entries(unzipped)) {
        extracted.push({
          name: path.split("/").pop() || path,
          data,
          path,
        });
      }

      setProgress(100);
      setExtractedFiles(extracted);
      setStatus("success");
      setStatusMessage(`已解压 ${extracted.length} 个文件`);
    } catch (error) {
      setStatus("error");
      setStatusMessage(`解压失败: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadExtractedFile = (file: { name: string; data: Uint8Array; path: string }) => {
    const blob = new Blob([new Uint8Array(file.data)]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllExtracted = () => {
    if (extractedFiles.length === 0) return;

    if (extractedFiles.length === 1) {
      downloadExtractedFile(extractedFiles[0]);
      return;
    }

    const zipData: fflate.Zippable = {};
    for (const file of extractedFiles) {
      zipData[file.path] = file.data;
    }
    const zipped = fflate.zipSync(zipData);
    const blob = new Blob([zipped], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extracted_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    resetState();
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <Card className="overflow-hidden border-2 py-0">
        <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileArchive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">文件打包与解压</h2>
              <p className="text-sm text-muted-foreground">
                纯前端处理，文件不会上传到服务器，支持 ZIP 格式压缩和解压
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Mode Selection */}
      <Card className="overflow-hidden border-2 py-0">
        <div className="flex">
          <button
            onClick={() => handleModeChange("compress")}
            className={`flex flex-1 items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              mode === "compress"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 hover:bg-muted/50"
            }`}
          >
            <Archive className="h-4 w-4" />
            压缩文件
          </button>
          <button
            onClick={() => handleModeChange("extract")}
            className={`flex flex-1 items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              mode === "extract"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 hover:bg-muted/50"
            }`}
          >
            <ArchiveRestore className="h-4 w-4" />
            解压文件
          </button>
        </div>
      </Card>

      {/* Upload Area */}
      <Card
        className="overflow-hidden border-2 border-dashed py-0 transition-colors hover:border-primary/50"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {mode === "compress" ? "拖拽文件到此处，或点击选择文件" : "拖拽 ZIP 文件到此处，或点击选择"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "compress" ? "支持选择多个文件进行压缩" : "支持 .zip 格式文件"}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple={mode === "compress"}
              accept={mode === "extract" ? ".zip" : undefined}
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            {mode === "compress" && (
              <input
                ref={folderInputRef}
                type="file"
                // @ts-expect-error - webkitdirectory is not in standard types
                webkitdirectory=""
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <File className="mr-2 h-4 w-4" />
              选择文件
            </Button>
            {mode === "compress" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => folderInputRef.current?.click()}
              >
                <Folder className="mr-2 h-4 w-4" />
                选择文件夹
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card className="overflow-hidden border-2 py-0">
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
            <h3 className="text-sm font-semibold">
              {mode === "compress" ? "待压缩文件" : "待解压文件"}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {files.length} 个文件 · {formatSize(files.reduce((sum, f) => sum + f.size, 0))}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={resetState}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between border-b px-4 py-2 last:border-b-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {file.name.endsWith(".zip") ? (
                    <FileArchive className="h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <File className="h-4 w-4 shrink-0 text-blue-500" />
                  )}
                  <span className="truncate text-sm">{file.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="rounded-md p-1 hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t bg-muted/20 px-4 py-3">
            <Button
              onClick={mode === "compress" ? compressFiles : extractFile}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : mode === "compress" ? (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  压缩并下载
                </>
              ) : (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  解压文件
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Progress */}
      {isProcessing && (
        <Card className="overflow-hidden border-2 py-0">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">处理进度</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Status */}
      {status !== "idle" && (
        <Card
          className={`overflow-hidden border-2 py-0 ${
            status === "success" ? "border-green-500/50" : "border-red-500/50"
          }`}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            {status === "success" ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm">{statusMessage}</span>
          </div>
        </Card>
      )}

      {/* Extracted Files */}
      {mode === "extract" && extractedFiles.length > 0 && (
        <Card className="overflow-hidden border-2 py-0">
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
            <h3 className="text-sm font-semibold">已解压文件</h3>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={downloadAllExtracted}
            >
              <Download className="h-3.5 w-3.5" />
              全部下载
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {extractedFiles.map((file, index) => (
              <div
                key={`${file.path}-${index}`}
                className="flex items-center justify-between border-b px-4 py-2 last:border-b-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <File className="h-4 w-4 shrink-0 text-blue-500" />
                  <span className="truncate text-sm font-mono">{file.path}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{formatSize(file.data.length)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => downloadExtractedFile(file)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tips */}
      <Card className="border-2 py-0">
        <div className="flex flex-wrap items-center gap-6 px-6 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
            <span>所有处理在浏览器本地完成，文件不会上传</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Archive className="h-3.5 w-3.5" />
            <span>支持 ZIP 格式压缩和解压</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
