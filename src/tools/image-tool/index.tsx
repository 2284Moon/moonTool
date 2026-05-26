"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Crop,
  Download,
  FlipHorizontal, FlipVertical,
  Loader2,
  Lock,
  RefreshCw,
  RotateCw,
  Sparkles,
  Unlock,
  Upload
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Upscaler from "upscaler";

// ====== 自定义裁剪器 ======

interface CropArea { x: number; y: number; w: number; h: number } // 百分比 0-100

interface EditorParams {
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  crop: CropArea | null;
}

function EditorModal({
  imgUrl,
  initial,
  imgSize,
  onConfirm,
  onCancel,
}: {
  imgUrl: string;
  initial: EditorParams;
  imgSize: { w: number; h: number };
  onConfirm: (p: EditorParams) => void;
  onCancel: () => void;
}) {
  const [rotation, setRotation] = useState(initial.rotation);
  const [flipH, setFlipH] = useState(initial.flipH);
  const [flipV, setFlipV] = useState(initial.flipV);
  const [crop, setCrop] = useState<CropArea | null>(initial.crop);
  const [cropMode, setCropMode] = useState(initial.crop !== null);
  const [previewUrl, setPreviewUrl] = useState(imgUrl);
  const [previewSize, setPreviewSize] = useState(imgSize);
  const [imageFrame, setImageFrame] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // 裁剪拖拽逻辑（复用）
  const [rect, setRect] = useState<CropArea>(initial.crop || { x: 10, y: 10, w: 80, h: 80 });
  const [dragging, setDragging] = useState<"move" | "nw" | "ne" | "sw" | "se" | null>(null);
  const dragRef = useRef({ startX: 0, startY: 0, startRect: { x: 0, y: 0, w: 0, h: 0 } });
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = applyRotateFlip(img, rotation, flipH, flipV);
      setPreviewSize({ w: canvas.width, h: canvas.height });
      setPreviewUrl(canvas.toDataURL());
    };
    img.src = imgUrl;
  }, [imgUrl, rotation, flipH, flipV]);

  const measureImageFrame = useCallback(() => {
    const container = cropContainerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    setImageFrame({
      x: imgRect.left - containerRect.left,
      y: imgRect.top - containerRect.top,
      w: imgRect.width,
      h: imgRect.height,
    });
  }, []);

  useEffect(() => {
    measureImageFrame();
    const container = cropContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(measureImageFrame);
    observer.observe(container);
    window.addEventListener("resize", measureImageFrame);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureImageFrame);
    };
  }, [measureImageFrame, previewUrl]);

  const onPointerDown = (mode: "move" | "nw" | "ne" | "sw" | "se") => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragging(mode);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startRect: { ...rect } };
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!imageFrame.w || !imageFrame.h) return;
      const dx = ((e.clientX - dragRef.current.startX) / imageFrame.w) * 100;
      const dy = ((e.clientY - dragRef.current.startY) / imageFrame.h) * 100;
      const s = dragRef.current.startRect;
      let nr = { ...s };
      if (dragging === "move") { nr.x = s.x + dx; nr.y = s.y + dy; }
      else {
        if (dragging.includes("e")) nr.w = s.w + dx;
        if (dragging.includes("w")) { nr.x = s.x + dx; nr.w = s.w - dx; }
        if (dragging.includes("s")) nr.h = s.h + dy;
        if (dragging.includes("n")) { nr.y = s.y + dy; nr.h = s.h - dy; }
        if (nr.w < 5) { nr.w = 5; if (dragging.includes("w")) nr.x = s.x + s.w - 5; }
        if (nr.h < 5) { nr.h = 5; if (dragging.includes("n")) nr.y = s.y + s.h - 5; }
      }
      nr.x = clamp(nr.x, 0, 100 - nr.w);
      nr.y = clamp(nr.y, 0, 100 - nr.h);
      nr.w = clamp(nr.w, 5, 100 - nr.x);
      nr.h = clamp(nr.h, 5, 100 - nr.y);
      setRect(nr);
      setCrop(nr);
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, imageFrame.h, imageFrame.w]);

  const handleConfirm = () => {
    onConfirm({ rotation, flipH, flipV, crop: cropMode ? crop : null });
  };

  const handleReset = () => {
    setRotation(0); setFlipH(false); setFlipV(false);
    setCrop(null); setCropMode(false);
    setRect({ x: 10, y: 10, w: 80, h: 80 });
  };

  // 预览转换后的尺寸
  const previewW = cropMode && crop ? Math.round(previewSize.w * crop.w / 100) : previewSize.w;
  const previewH = cropMode && crop ? Math.round(previewSize.h * crop.h / 100) : previewSize.h;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={onCancel}>
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-sm font-semibold">✂️ 编辑图片</h3>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onCancel}>
            <span className="text-lg leading-none">&times;</span>
          </Button>
        </div>

        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-1.5 border-b px-5 py-2.5">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRotation((r) => (r + 90) % 360)}>
            <RotateCw className="mr-1 h-3.5 w-3.5" /> 左旋 90°
          </Button>
          <Button variant={flipH ? "secondary" : "outline"} size="sm" className="h-8 text-xs" onClick={() => setFlipH(!flipH)}>
            <FlipHorizontal className="mr-1 h-3.5 w-3.5" /> 水平翻转
          </Button>
          <Button variant={flipV ? "secondary" : "outline"} size="sm" className="h-8 text-xs" onClick={() => setFlipV(!flipV)}>
            <FlipVertical className="mr-1 h-3.5 w-3.5" /> 垂直翻转
          </Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button variant={cropMode ? "secondary" : "outline"} size="sm" className="h-8 text-xs" onClick={() => { setCropMode(!cropMode); if (!cropMode) setCrop(rect); else setCrop(null); }}>
            <Crop className="mr-1 h-3.5 w-3.5" /> 裁剪
          </Button>
        </div>

        {/* 图片区域 */}
        <div
          ref={cropContainerRef}
          className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#111] select-none"
          style={{ minHeight: 280 }}
        >
          <img
            ref={imgRef}
            src={previewUrl}
            className="mx-auto h-auto max-h-full w-auto max-w-full object-contain"
            alt="edit preview"
            draggable={false}
            onLoad={measureImageFrame}
          />
          {cropMode && imageFrame.w > 0 && imageFrame.h > 0 && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: imageFrame.x,
                top: imageFrame.y,
                width: imageFrame.w,
                height: imageFrame.h,
              }}
            >
              <div className="absolute left-0 top-0 bg-black/55" style={{ width: `${rect.x}%`, height: "100%" }} />
              <div className="absolute right-0 top-0 bg-black/55" style={{ width: `${100 - rect.x - rect.w}%`, height: "100%" }} />
              <div className="absolute bg-black/55" style={{ left: `${rect.x}%`, top: 0, width: `${rect.w}%`, height: `${rect.y}%` }} />
              <div className="absolute bg-black/55" style={{ left: `${rect.x}%`, bottom: 0, width: `${rect.w}%`, height: `${100 - rect.y - rect.h}%` }} />
              <div
                className="pointer-events-auto absolute cursor-move border-2 border-white"
                style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%` }}
                onMouseDown={onPointerDown("move")}
              >
                {(["nw", "ne", "sw", "se"] as const).map((c) => (
                  <div
                    key={c}
                    className={`absolute h-3 w-3 rounded-sm border-2 border-white bg-blue-500 ${
                      c.includes("n") ? "-top-1.5" : "-bottom-1.5"
                    } ${c.includes("w") ? "-left-1.5" : "-right-1.5"} cursor-${c}-resize`}
                    onMouseDown={onPointerDown(c)}
                  />
                ))}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute left-1/3 top-0 h-full w-px bg-white" />
                  <div className="absolute left-2/3 top-0 h-full w-px bg-white" />
                  <div className="absolute left-0 top-1/3 h-px w-full bg-white" />
                  <div className="absolute left-0 top-2/3 h-px w-full bg-white" />
                </div>
              </div>
            </div>
          )}
          {/* 旋转/翻转状态指示 */}
          {(rotation !== 0 || flipH || flipV) && !cropMode && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white">
                已旋转 {rotation}°{flipH ? " · 水平翻转" : ""}{flipV ? " · 垂直翻转" : ""}
              </div>
            </div>
          )}
        </div>

        {/* 底部信息 + 按钮 */}
        <div className="flex items-center justify-between border-t px-5 py-3">
          <span className="text-xs text-muted-foreground">
            原始 {imgSize.w}×{imgSize.h} → 输出 {previewW}×{previewH}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset}>重置编辑</Button>
            <Button variant="outline" size="sm" onClick={onCancel}>取消</Button>
            <Button size="sm" onClick={handleConfirm}>确认</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== 编辑工具 ======

function applyRotateFlip(
  img: HTMLImageElement,
  rotation: number,
  flipH: boolean,
  flipV: boolean
): HTMLCanvasElement {
  const rad = (rotation * Math.PI) / 180;
  let w = img.naturalWidth, h = img.naturalHeight;
  if (Math.abs(rotation) % 180 === 90) { [w, h] = [h, w]; }
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(w / 2, h / 2);
  if (flipH) ctx.scale(-1, 1);
  if (flipV) ctx.scale(1, -1);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return canvas;
}
// ====== 格式 ======
const FORMATS = [
  { value: "image/jpeg", label: "JPEG", ext: ".jpg" },
  { value: "image/webp", label: "WebP", ext: ".webp" },
  { value: "image/png", label: "PNG", ext: ".png" },
] as const;

// ====== 锐化卷积核 ======
function applySharpen(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength: number
) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  // 根据强度调整中心权重
  const centerWeight = 4 + strength; // strength 0-1 → center 4-5
  kernel[4] = centerWeight;

  const copy = new Uint8ClampedArray(data);
  const kw = 3, kh = 3, halfKx = 1, halfKy = 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = 0; ky < kh; ky++) {
        for (let kx = 0; kx < kw; kx++) {
          const px = Math.min(Math.max(x + kx - halfKx, 0), w - 1);
          const py = Math.min(Math.max(y + ky - halfKy, 0), h - 1);
          const idx = (py * w + px) * 4;
          const k = kernel[ky * kw + kx];
          r += copy[idx] * k;
          g += copy[idx + 1] * k;
          b += copy[idx + 2] * k;
        }
      }
      const idx = (y * w + x) * 4;
      data[idx] = Math.min(255, Math.max(0, r));
      data[idx + 1] = Math.min(255, Math.max(0, g));
      data[idx + 2] = Math.min(255, Math.max(0, b));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyBrightnessContrast(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  brightness: number,
  contrast: number
) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = data[i + c];
      v = v + brightness * 50; // brightness: -1 to 1
      v = factor * (v - 128) + 128;
      data[i + c] = Math.min(255, Math.max(0, v));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// ====== 格式化文件大小 ======
function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

// ====== 组件 ======

export function ImageTool() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [originalSize, setOriginalSize] = useState({ w: 0, h: 0 });
  const [processedUrl, setProcessedUrl] = useState("");
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);

  // --- 编辑状态 ---
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  // 编辑后的源图（供后续处理用）
  const [editSource, setEditSource] = useState<HTMLCanvasElement | null>(null);

  // 调参
  const [quality, setQuality] = useState(80);
  const [targetW, setTargetW] = useState(0);
  const [targetH, setTargetH] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);
  const [format, setFormat] = useState(FORMATS[0]);
  const [sharpen, setSharpen] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);

  // --- AI 增强 ---
  const [upscaler] = useState(() => new Upscaler());
  const [enhanceScale, setEnhanceScale] = useState(2);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState(0);
  const [enhancedUrl, setEnhancedUrl] = useState("");
  const [enhancedBlob, setEnhancedBlob] = useState<Blob | null>(null);

  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);

  // 上传
  const handleFile = useCallback((file: File) => {
    setOriginalFile(file);
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);

    const img = new Image();
    img.onload = () => {
      originalImgRef.current = img;
      setOriginalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setTargetW(img.naturalWidth);
      setTargetH(img.naturalHeight);
      setEditSource(applyRotateFlip(img, 0, false, false));
    };
    img.src = url;
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) handleFile(f);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  // 编辑效果 → editSource（非破坏式，每次编辑重算）
  useEffect(() => {
    if (!originalImgRef.current) {
      setEditSource(null);
      return;
    }

    const canvas = applyRotateFlip(originalImgRef.current, rotation, flipH, flipV);
    if (!cropArea) {
      setEditSource(canvas);
      return;
    }

    const cw = canvas.width;
    const ch = canvas.height;
    const x = Math.max(0, Math.min(cw - 1, Math.round((cropArea.x / 100) * cw)));
    const y = Math.max(0, Math.min(ch - 1, Math.round((cropArea.y / 100) * ch)));
    const w = Math.max(1, Math.min(cw - x, Math.round((cropArea.w / 100) * cw)));
    const h = Math.max(1, Math.min(ch - y, Math.round((cropArea.h / 100) * ch)));
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = w;
    cropCanvas.height = h;
    cropCanvas.getContext("2d")!.drawImage(canvas, x, y, w, h, 0, 0, w, h);
    setEditSource(cropCanvas);
  }, [originalUrl, rotation, flipH, flipV, cropArea]);

  useEffect(() => {
    if (!originalImgRef.current || !originalCanvasRef.current) return;
    const oc = originalCanvasRef.current;
    oc.width = originalImgRef.current.naturalWidth;
    oc.height = originalImgRef.current.naturalHeight;
    oc.getContext("2d")!.drawImage(originalImgRef.current, 0, 0);
  }, [originalUrl, originalSize.w, originalSize.h]);

  useEffect(() => {
    if (!editSource) return;
    setTargetW(editSource.width);
    setTargetH(editSource.height);
  }, [editSource]);

  useEffect(() => {
    if (!editSource || !targetW || !targetH) return;

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(editSource, 0, 0, targetW, targetH);

    if (sharpen > 0) {
      applySharpen(ctx, targetW, targetH, sharpen);
    }
    if (brightness !== 0 || contrast !== 0) {
      applyBrightnessContrast(ctx, targetW, targetH, brightness, contrast);
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setProcessedBlob(blob);
        setProcessedUrl(URL.createObjectURL(blob));
      },
      format.value,
      quality / 100
    );

    if (processedCanvasRef.current) {
      const pc = processedCanvasRef.current;
      pc.width = targetW;
      pc.height = targetH;
      pc.getContext("2d")!.drawImage(canvas, 0, 0);
    }
  }, [editSource, targetW, targetH, quality, format, sharpen, brightness, contrast]);

  const handleW = (v: number) => {
    if (v < 1 || v > 4096) return;
    const sourceW = editSource?.width || originalSize.w;
    const sourceH = editSource?.height || originalSize.h;
    if (lockAspect && sourceW && sourceH) {
      setTargetH(Math.round((v / sourceW) * sourceH));
    }
    setTargetW(v);
  };

  const handleH = (v: number) => {
    if (v < 1 || v > 4096) return;
    const sourceW = editSource?.width || originalSize.w;
    const sourceH = editSource?.height || originalSize.h;
    if (lockAspect && sourceW && sourceH) {
      setTargetW(Math.round((v / sourceH) * sourceW));
    }
    setTargetH(v);
  };

  const handleDownload = () => {
    if (!processedUrl || !originalFile) return;
    const a = document.createElement("a");
    a.href = processedUrl;
    const name = originalFile.name.replace(/\.[^.]+$/, "") + format.ext;
    a.download = name;
    a.click();
  };

  const handleEnhance = async () => {
    if (!editSource) return;
    setEnhancing(true);
    setEnhanceProgress(0);
    setEnhancedUrl("");
    try {
      const result = await upscaler.upscale(editSource, {
        output: "canvas",
        patchSize: 64,
        padding: 6,
        progress: (p: number) => setEnhanceProgress(Math.round(p * 100)),
      });
      const canvas = result as HTMLCanvasElement;
      canvas.toBlob((blob) => {
        if (blob) {
          setEnhancedBlob(blob);
          setEnhancedUrl(URL.createObjectURL(blob));
        }
      }, "image/png");
    } catch (e) {
      console.error("AI 增强失败:", e);
    } finally {
      setEnhancing(false);
    }
  };

  const handleReset = () => {
    setOriginalFile(null);
    setOriginalUrl("");
    setOriginalSize({ w: 0, h: 0 });
    setProcessedUrl("");
    setProcessedBlob(null);
    setQuality(80);
    setSharpen(0);
    setBrightness(0);
    setContrast(0);
    setLockAspect(true);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCropArea(null);
    setEditSource(null);
    originalImgRef.current = null;
  };

  return (
    <div className="w-full space-y-3">
      {/* 上传区域 */}
      {!originalFile && (
        <Card
          className="flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-blue-500/30 py-16 transition-colors hover:border-blue-500/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById("image-upload")?.click()}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
            <Upload className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">点击或拖拽上传图片</p>
            <p className="text-xs text-muted-foreground">
              支持 JPG、PNG、WebP、GIF、BMP、SVG
            </p>
          </div>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </Card>
      )}

      {/* 编辑弹窗 */}
      {showCropper && originalUrl && (
        <EditorModal
          imgUrl={originalUrl}
          imgSize={originalSize}
          initial={{ rotation, flipH, flipV, crop: cropArea }}
          onConfirm={(p) => {
            setRotation(p.rotation);
            setFlipH(p.flipH);
            setFlipV(p.flipV);
            setCropArea(p.crop);
            setShowCropper(false);
          }}
          onCancel={() => {
            setShowCropper(false);
          }}
        />
      )}

      {originalFile && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          {/* ===== 左栏：预览 ===== */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
            <Card className="flex flex-col overflow-hidden border-2 border-dashed border-blue-500/30 bg-card py-0">
              <div className="border-b bg-muted/50 px-4 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">📷 原图</h3>
                    <p className="text-xs text-muted-foreground">
                      {`${originalSize.w} × ${originalSize.h}`} · {fmtSize(originalFile.size)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowCropper(true)}>
                    <Crop className="mr-1 h-3 w-3" /> 编辑
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center overflow-auto bg-checkerboard p-4">
                <canvas
                  ref={originalCanvasRef}
                  className="max-h-[420px] max-w-full object-contain"
                />
              </div>
            </Card>

            <Card className="flex flex-col overflow-hidden border-2 border-dashed border-green-500/30 bg-card py-0">
              <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                <div>
                  <h3 className="text-sm font-semibold">✨ 处理后</h3>
                  <p className="text-xs text-muted-foreground">
                    {targetW} × {targetH}
                    {processedBlob && (
                      <span className="ml-2 text-green-600 dark:text-green-400">
                        · {fmtSize(processedBlob.size)}{" "}
                        {originalFile.size > 0 &&
                          `(${originalFile.size > processedBlob.size ? "-" : "+"}${Math.abs(100 - Math.round((processedBlob.size / originalFile.size) * 100))}%)`}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleDownload}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center overflow-auto bg-checkerboard p-4">
                <canvas
                  ref={processedCanvasRef}
                  className="max-h-[420px] max-w-full object-contain"
                />
              </div>
            </Card>
          </div>
          </div>

          {/* ===== 右栏：控件 ===== */}
          <div className="space-y-3 lg:sticky lg:top-14 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
          {/* 调参 */}
          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">🎚️ 调整参数</h3>

            {/* 格式 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">输出格式</label>
              <div className="flex gap-2">
                {FORMATS.map((f) => (
                  <Button
                    key={f.value}
                    variant={format.value === f.value ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setFormat(f)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 质量 */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>质量</span>
                <span className="font-mono">{quality}%</span>
              </label>
              <input
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(e) => setQuality(+e.target.value)}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/60">
                <span>小文件</span><span>高质量</span>
              </div>
            </div>

            {/* 尺寸 */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>尺寸</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-1.5 text-xs"
                  onClick={() => setLockAspect(!lockAspect)}
                >
                  {lockAspect ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  {lockAspect ? "已锁定比例" : "自由调整"}
                </Button>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="h-9 w-24 rounded-lg border border-input bg-background px-3 font-mono text-sm focus:border-blue-500/50 focus:outline-none"
                  value={targetW}
                  onChange={(e) => handleW(+e.target.value)}
                />
                <span className="text-muted-foreground">×</span>
                <input
                  type="number"
                  className="h-9 w-24 rounded-lg border border-input bg-background px-3 font-mono text-sm focus:border-blue-500/50 focus:outline-none"
                  value={targetH}
                  onChange={(e) => handleH(+e.target.value)}
                />
                <span className="text-xs text-muted-foreground">px</span>
              </div>
            </div>

            {/* 锐化 */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>锐化</span>
                <span className="font-mono">
                  {sharpen === 0 ? "无" : sharpen < 0.4 ? "轻微" : sharpen < 0.7 ? "中等" : "强烈"}
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sharpen}
                onChange={(e) => setSharpen(+e.target.value)}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
            </div>

            {/* 亮度 */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>亮度</span>
                <span className="font-mono">{brightness > 0 ? "+" : ""}{brightness}</span>
              </label>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.1}
                value={brightness}
                onChange={(e) => setBrightness(+e.target.value)}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
            </div>

            {/* 对比度 */}
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>对比度</span>
                <span className="font-mono">{contrast > 0 ? "+" : ""}{contrast}</span>
              </label>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.1}
                value={contrast}
                onChange={(e) => setContrast(+e.target.value)}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleDownload}>
                <Download className="mr-1 h-3.5 w-3.5" /> 下载
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> 重新上传
              </Button>
            </div>
          </Card>

          {/* AI 增强 */}
          <Card className="space-y-3 border-2 border-dashed border-purple-500/30 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI 超分辨率增强
            </h3>
            <p className="text-xs text-muted-foreground">
              基于 ESRGAN 模型，将图片放大并智能填充细节。首次使用需加载约 5MB 模型文件。
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">放大倍数：</span>
                {[2, 3, 4].map((s) => (
                  <Button
                    key={s}
                    variant={enhanceScale === s ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 w-10 font-mono text-xs"
                    onClick={() => setEnhanceScale(s)}
                  >
                    {s}x
                  </Button>
                ))}
              </div>
              <Button
                size="sm"
                onClick={handleEnhance}
                disabled={enhancing}
              >
                {enhancing ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                )}
                {enhancing ? `处理中 ${enhanceProgress}%...` : "开始增强"}
              </Button>
            </div>

            {enhancing && (
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${enhanceProgress}%` }}
                  />
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  AI 正在处理图像... {enhanceProgress}%
                </p>
              </div>
            )}

            {enhancedUrl && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-muted-foreground">
                    增强结果
                    {enhancedBlob && (
                      <span className="ml-2 text-green-600 dark:text-green-400">
                        {fmtSize(enhancedBlob.size)}
                      </span>
                    )}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = enhancedUrl;
                      a.download = (originalFile?.name || "image").replace(/\.[^.]+$/, "") + "-enhanced.png";
                      a.click();
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center justify-center overflow-auto rounded-lg bg-checkerboard p-2">
                  <img
                    src={enhancedUrl}
                    alt="增强结果"
                    className="max-h-[400px] max-w-full object-contain"
                  />
                </div>
              </div>
            )}

            <div className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              💡 AI 增强适合卡通、照片、图标等。处理时间取决于图片尺寸和设备性能，通常在 2-15 秒。
            </div>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
