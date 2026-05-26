"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Eraser, ImagePlus, MapPin, ShieldCheck, Trash2 } from "lucide-react";

type ExifValue = string | number;

interface ExifItem {
  key: string;
  label: string;
  value: ExifValue;
  group: "设备" | "拍摄" | "位置" | "图像" | "其他";
}

const TAGS: Record<number, { label: string; key: string; group: ExifItem["group"] }> = {
  0x010f: { label: "制造商", key: "make", group: "设备" },
  0x0110: { label: "设备型号", key: "model", group: "设备" },
  0x0112: { label: "方向", key: "orientation", group: "图像" },
  0x0131: { label: "软件", key: "software", group: "设备" },
  0x0132: { label: "修改时间", key: "modifyDate", group: "拍摄" },
  0x829a: { label: "曝光时间", key: "exposureTime", group: "拍摄" },
  0x829d: { label: "光圈", key: "fNumber", group: "拍摄" },
  0x8827: { label: "ISO", key: "iso", group: "拍摄" },
  0x9003: { label: "拍摄时间", key: "dateTimeOriginal", group: "拍摄" },
  0x9209: { label: "闪光灯", key: "flash", group: "拍摄" },
  0x920a: { label: "焦距", key: "focalLength", group: "拍摄" },
  0xa002: { label: "原始宽度", key: "pixelWidth", group: "图像" },
  0xa003: { label: "原始高度", key: "pixelHeight", group: "图像" },
};

const GPS_TAGS: Record<number, string> = {
  0x0001: "GPS 纬度方向",
  0x0002: "GPS 纬度",
  0x0003: "GPS 经度方向",
  0x0004: "GPS 经度",
  0x0005: "GPS 高度参考",
  0x0006: "GPS 高度",
  0x001d: "GPS 日期",
};

const readAscii = (view: DataView, start: number, length: number) => {
  let text = "";
  for (let i = 0; i < length; i++) {
    const code = view.getUint8(start + i);
    if (code === 0) break;
    text += String.fromCharCode(code);
  }
  return text.trim();
};

const rational = (view: DataView, offset: number, little: boolean) => {
  const numerator = view.getUint32(offset, little);
  const denominator = view.getUint32(offset + 4, little);
  return denominator ? numerator / denominator : 0;
};

const formatValue = (view: DataView, tiff: number, type: number, count: number, valueOffset: number, little: boolean) => {
  const size = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8][type] || 1;
  const bytes = size * count;
  const valueStart = bytes <= 4 ? valueOffset : tiff + view.getUint32(valueOffset, little);

  if (type === 2) return readAscii(view, valueStart, count);
  if (type === 3) return count === 1 ? view.getUint16(valueStart, little) : Array.from({ length: count }, (_, i) => view.getUint16(valueStart + i * 2, little)).join(", ");
  if (type === 4) return count === 1 ? view.getUint32(valueStart, little) : Array.from({ length: count }, (_, i) => view.getUint32(valueStart + i * 4, little)).join(", ");
  if (type === 5) return count === 1 ? rational(view, valueStart, little) : Array.from({ length: count }, (_, i) => rational(view, valueStart + i * 8, little));
  return readAscii(view, valueStart, bytes);
};

const parseIfd = (view: DataView, tiff: number, offset: number, little: boolean, gps = false): ExifItem[] => {
  const items: ExifItem[] = [];
  const entryCount = view.getUint16(tiff + offset, little);
  for (let i = 0; i < entryCount; i++) {
    const entry = tiff + offset + 2 + i * 12;
    const tag = view.getUint16(entry, little);
    const type = view.getUint16(entry + 2, little);
    const count = view.getUint32(entry + 4, little);
    const valueOffset = entry + 8;
    const value = formatValue(view, tiff, type, count, valueOffset, little);

    if (gps) {
      const label = GPS_TAGS[tag];
      if (label) items.push({ key: `gps-${tag}`, label, value: Array.isArray(value) ? value.join(", ") : value, group: "位置" });
    } else {
      const meta = TAGS[tag];
      if (meta) items.push({ ...meta, value: Array.isArray(value) ? value.join(", ") : value });
      if (tag === 0x8825 && typeof value === "number") items.push(...parseIfd(view, tiff, value, little, true));
    }
  }
  return items;
};

const toGpsDecimal = (values: ExifItem[]) => {
  const lat = values.find((i) => i.label === "GPS 纬度")?.value;
  const latRef = values.find((i) => i.label === "GPS 纬度方向")?.value;
  const lng = values.find((i) => i.label === "GPS 经度")?.value;
  const lngRef = values.find((i) => i.label === "GPS 经度方向")?.value;
  const convert = (value: ExifValue, ref: ExifValue | undefined) => {
    const parts = String(value).split(",").map((n) => Number(n.trim()));
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    const sign = ref === "S" || ref === "W" ? -1 : 1;
    return sign * (parts[0] + parts[1] / 60 + parts[2] / 3600);
  };
  const latDec = lat && convert(lat, latRef);
  const lngDec = lng && convert(lng, lngRef);
  return latDec && lngDec ? { lat: latDec, lng: lngDec } : null;
};

const parseExif = (buffer: ArrayBuffer): ExifItem[] => {
  const view = new DataView(buffer);
  if (view.getUint16(0) !== 0xffd8) return [];

  let offset = 2;
  while (offset < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    const length = view.getUint16(offset + 2);
    if (marker === 0xe1 && readAscii(view, offset + 4, 6) === "Exif") {
      const tiff = offset + 10;
      const little = view.getUint16(tiff) === 0x4949;
      const firstIfd = view.getUint32(tiff + 4, little);
      return parseIfd(view, tiff, firstIfd, little);
    }
    offset += 2 + length;
  }
  return [];
};

const stripExif = (buffer: ArrayBuffer) => {
  const view = new DataView(buffer);
  if (view.getUint16(0) !== 0xffd8) return buffer;
  const chunks: Uint8Array[] = [new Uint8Array(buffer.slice(0, 2))];
  let offset = 2;

  while (offset < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      chunks.push(new Uint8Array(buffer.slice(offset)));
      break;
    }
    const marker = view.getUint8(offset + 1);
    if (marker === 0xda) {
      chunks.push(new Uint8Array(buffer.slice(offset)));
      break;
    }
    const length = view.getUint16(offset + 2);
    const isExif = marker === 0xe1 && readAscii(view, offset + 4, 6) === "Exif";
    if (!isExif) chunks.push(new Uint8Array(buffer.slice(offset, offset + 2 + length)));
    offset += 2 + length;
  }

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let cursor = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, cursor);
    cursor += chunk.length;
  });
  return output.buffer;
};

export function ExifTool() {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<ExifItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [cleanUrl, setCleanUrl] = useState("");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const gps = useMemo(() => toGpsDecimal(items), [items]);
  const grouped = useMemo(() => {
    return items.reduce<Record<string, ExifItem[]>>((acc, item) => {
      acc[item.group] = [...(acc[item.group] || []), item];
      return acc;
    }, {});
  }, [items]);

  const loadFile = async (nextFile: File) => {
    setFile(nextFile);
    setCleanUrl("");
    setPreviewUrl(URL.createObjectURL(nextFile));
    const buffer = await nextFile.arrayBuffer();
    const parsed = parseExif(buffer);
    setItems(parsed);
    setMessage(parsed.length ? `读取到 ${parsed.length} 条 EXIF 信息` : "没有发现可读取的 EXIF 信息");
  };

  const cleanExif = async () => {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const cleaned = stripExif(buffer);
    const blob = new Blob([cleaned], { type: file.type || "image/jpeg" });
    setCleanUrl(URL.createObjectURL(blob));
    setMessage("已生成清除 EXIF 后的图片，原图不会被修改");
  };

  const downloadClean = () => {
    if (!cleanUrl || !file) return;
    const link = document.createElement("a");
    link.href = cleanUrl;
    link.download = file.name.replace(/\.[^.]+$/, "") + "-no-exif.jpg";
    link.click();
  };

  return (
    <div className="w-full space-y-4">
      <Card
        className="flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-blue-500/30 py-14 transition-colors hover:border-blue-500/60"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files[0];
          if (dropped?.type.startsWith("image/")) loadFile(dropped);
        }}
      >
        <ImagePlus className="h-10 w-10 text-muted-foreground/50" />
        <div className="text-center">
          <p className="text-sm font-medium">选择或拖入照片</p>
          <p className="text-xs text-muted-foreground">支持手机原图 JPEG 的 EXIF 与 GPS 信息读取、清除</p>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
      </Card>

      {file && (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card className="overflow-hidden border-2 py-0">
            <div className="border-b bg-muted/50 px-4 py-2">
              <h2 className="text-sm font-semibold">照片预览</h2>
              <p className="text-xs text-muted-foreground">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div className="bg-checkerboard p-4">
              <img src={previewUrl} alt="preview" className="max-h-[360px] w-full rounded-md object-contain" />
            </div>
            <div className="flex flex-wrap gap-2 border-t p-4">
              <Button size="sm" onClick={cleanExif}>
                <Eraser className="mr-1 h-3.5 w-3.5" /> 清除 EXIF
              </Button>
              <Button size="sm" variant="outline" onClick={downloadClean} disabled={!cleanUrl}>
                <Download className="mr-1 h-3.5 w-3.5" /> 下载隐私版
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setFile(null); setItems([]); setPreviewUrl(""); setCleanUrl(""); }}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> 清空
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="border-2 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">{message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">所有处理都在浏览器本地完成，不会上传图片。</p>
                </div>
              </div>
            </Card>

            {gps && (
              <Card className="border-2 border-amber-500/30 p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold">发现 GPS 坐标</p>
                    <p className="mt-1 font-mono text-sm">{gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}</p>
                  </div>
                </div>
              </Card>
            )}

            {Object.keys(grouped).length > 0 ? (
              Object.entries(grouped).map(([group, values]) => (
                <Card key={group} className="overflow-hidden border-2 py-0">
                  <div className="border-b bg-muted/50 px-4 py-2">
                    <h3 className="text-sm font-semibold">{group}</h3>
                  </div>
                  <div className="divide-y">
                    {values.map((item) => (
                      <div key={item.key + item.label} className="grid gap-1 px-4 py-2.5 md:grid-cols-[160px_1fr]">
                        <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                        <span className="break-all font-mono text-sm">{String(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            ) : (
              <Card className="border-2 border-dashed p-8 text-center text-sm text-muted-foreground">暂无 EXIF 信息可显示</Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
