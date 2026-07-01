"use client";

import { useMemo, useState } from "react";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  ArrowLeftRight,
  Copy,
  Download,
  FileJson,
  Table2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DataFormat = "json" | "yaml" | "csv";
type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

interface FormatOption {
  id: DataFormat;
  label: string;
  hint: string;
}

interface ConvertResult {
  output: string;
  error: string;
}

const formats: FormatOption[] = [
  { id: "json", label: "JSON", hint: "对象、数组、嵌套数据" },
  { id: "yaml", label: "YAML", hint: "配置文件、可读结构" },
  { id: "csv", label: "CSV", hint: "表格、列表数据" },
];

const sampleByFormat: Record<DataFormat, string> = {
  json: `[
  {
    "name": "moonTool",
    "type": "utility",
    "active": true
  },
  {
    "name": "data-converter",
    "type": "format",
    "active": true
  }
]`,
  yaml: `- name: moonTool
  type: utility
  active: true
- name: data-converter
  type: format
  active: true`,
  csv: `name,type,active
moonTool,utility,true
data-converter,format,true`,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new Error("CSV 引号未闭合");
  }

  if (field !== "" || row.length > 0 || text.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((items) => items.some((item) => item.trim() !== ""));
}

function uniqueHeader(header: string, index: number, used: Set<string>): string {
  const base = header.trim() || `column_${index + 1}`;
  let name = base;
  let suffix = 2;

  while (used.has(name)) {
    name = `${base}_${suffix}`;
    suffix++;
  }

  used.add(name);
  return name;
}

function parseCsvData(text: string, firstRowAsHeader: boolean): JsonValue {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  if (!firstRowAsHeader) {
    return rows;
  }

  const used = new Set<string>();
  const headers = rows[0].map((header, index) =>
    uniqueHeader(header, index, used)
  );

  return rows.slice(1).map((items) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = items[index] ?? "";
    });
    return record;
  });
}

function parseInput(
  text: string,
  format: DataFormat,
  firstRowAsHeader: boolean
): JsonValue {
  if (format === "json") {
    return JSON.parse(text);
  }

  if (format === "yaml") {
    const value = parseYaml(text);
    return (value ?? null) as JsonValue;
  }

  return parseCsvData(text, firstRowAsHeader);
}

function collectHeaders(records: Record<string, unknown>[]): string[] {
  const headers: string[] = [];
  const seen = new Set<string>();

  records.forEach((record) => {
    Object.keys(record).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    });
  });

  return headers;
}

function escapeCsvCell(value: unknown): string {
  const text = formatScalar(value);
  if (/[",\r\n]/.test(text) || text.trim() !== text) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function stringifyCsv(data: unknown, firstRowAsHeader: boolean): string {
  if (Array.isArray(data) && data.every((item) => Array.isArray(item))) {
    return data
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
      .join("\n");
  }

  const records = Array.isArray(data)
    ? data.filter((item): item is Record<string, unknown> => isRecord(item))
    : isRecord(data)
      ? [data]
      : [];

  if (records.length > 0) {
    const headers = collectHeaders(records);
    const body = records.map((record) =>
      headers.map((header) => escapeCsvCell(record[header])).join(",")
    );

    return firstRowAsHeader
      ? [headers.map(escapeCsvCell).join(","), ...body].join("\n")
      : body.join("\n");
  }

  if (Array.isArray(data)) {
    return data.map((item) => escapeCsvCell(item)).join("\n");
  }

  return firstRowAsHeader
    ? ["value", escapeCsvCell(data)].join("\n")
    : escapeCsvCell(data);
}

function stringifyOutput(
  data: JsonValue,
  format: DataFormat,
  firstRowAsHeader: boolean
): string {
  if (format === "json") {
    return JSON.stringify(data, null, 2);
  }

  if (format === "yaml") {
    return stringifyYaml(data, { indent: 2 }).trimEnd();
  }

  return stringifyCsv(data, firstRowAsHeader);
}

function convertData(
  input: string,
  inputFormat: DataFormat,
  outputFormat: DataFormat,
  firstRowAsHeader: boolean
): ConvertResult {
  if (!input.trim()) {
    return { output: "", error: "" };
  }

  try {
    const data = parseInput(input, inputFormat, firstRowAsHeader);
    return {
      output: stringifyOutput(data, outputFormat, firstRowAsHeader),
      error: "",
    };
  } catch (error) {
    return {
      output: "",
      error: error instanceof Error ? error.message : "转换失败",
    };
  }
}

function getFormatLabel(format: DataFormat): string {
  return (
    formats.find((item) => item.id === format)?.label ?? format.toUpperCase()
  );
}

function countLines(text: string): number {
  return text ? text.split(/\r\n|\r|\n/).length : 0;
}

export function DataConverter() {
  const [inputFormat, setInputFormat] = useState<DataFormat>("json");
  const [outputFormat, setOutputFormat] = useState<DataFormat>("yaml");
  const [input, setInput] = useState(sampleByFormat.json);
  const [firstRowAsHeader, setFirstRowAsHeader] = useState(true);

  const result = useMemo(
    () => convertData(input, inputFormat, outputFormat, firstRowAsHeader),
    [input, inputFormat, outputFormat, firstRowAsHeader]
  );

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard permission failures
    }
  };

  const handleClear = () => {
    setInput("");
  };

  const handleSwap = () => {
    if (!result.output) return;
    setInput(result.output);
    setInputFormat(outputFormat);
    setOutputFormat(inputFormat);
  };

  const handleUseSample = (format: DataFormat) => {
    setInputFormat(format);
    setInput(sampleByFormat[format]);
    if (format === outputFormat) {
      setOutputFormat(format === "json" ? "yaml" : "json");
    }
  };

  const handleDownload = () => {
    if (!result.output) return;
    const extension = outputFormat === "yaml" ? "yml" : outputFormat;
    const blob = new Blob([result.output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `converted.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const inputLines = countLines(input);
  const outputLines = countLines(result.output);

  return (
    <div className="w-full space-y-4">
      <Card className="border-0 bg-muted/30 p-3 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">输入</span>
            <div className="flex rounded-lg bg-background p-1 shadow-sm">
              {formats.map((format) => (
                <Button
                  key={format.id}
                  variant={inputFormat === format.id ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => handleUseSample(format.id)}
                >
                  {format.label}
                </Button>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleSwap}
            disabled={!result.output}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            交换
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">输出</span>
            <div className="flex rounded-lg bg-background p-1 shadow-sm">
              {formats.map((format) => (
                <Button
                  key={format.id}
                  variant={outputFormat === format.id ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setOutputFormat(format.id)}
                >
                  {format.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant={firstRowAsHeader ? "secondary" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFirstRowAsHeader((value) => !value)}
          >
            CSV 首行为表头 {firstRowAsHeader ? "开" : "关"}
          </Button>
          {formats.map((format) => (
            <Badge
              key={format.id}
              variant="outline"
              className="bg-background/60"
            >
              {format.label}: {format.hint}
            </Badge>
          ))}
        </div>
      </Card>

      {result.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <strong>转换错误：</strong> {result.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col overflow-hidden border bg-card py-0 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <FileJson className="h-4 w-4" />
                {getFormatLabel(inputFormat)} 输入
              </h2>
              <p className="text-xs text-muted-foreground">
                粘贴 {getFormatLabel(inputFormat)} 内容，右侧自动转换
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {inputLines} 行
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleCopy(input)}
                disabled={!input}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleClear}
                disabled={!input}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`在此粘贴 ${getFormatLabel(inputFormat)} 内容...`}
            className="h-[460px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            spellCheck={false}
          />
        </Card>

        <Card className="flex flex-col overflow-hidden border bg-card py-0 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Table2 className="h-4 w-4" />
                {getFormatLabel(outputFormat)} 输出
              </h2>
              <p className="text-xs text-muted-foreground">
                从 {getFormatLabel(inputFormat)} 转为 {getFormatLabel(outputFormat)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {outputLines} 行
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleCopy(result.output)}
                disabled={!result.output}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleDownload}
                disabled={!result.output}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <textarea
            value={result.output}
            readOnly
            placeholder="转换结果将显示在这里..."
            className="h-[460px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            spellCheck={false}
          />
        </Card>
      </div>
    </div>
  );
}
