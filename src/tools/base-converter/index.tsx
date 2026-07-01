"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Binary,
  Copy,
  Download,
  Hash,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type BaseSelection = "auto" | string;

interface ParsedNumber {
  negative: boolean;
  integer: bigint;
  numerator: bigint;
  denominator: bigint;
}

interface ConvertResult {
  output: string;
  error: string;
}

const digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ZERO = BigInt(0);
const ONE = BigInt(1);
const sampleInput = `0b101010
0o52
42
0x2A
Z`;

const quickBases = [
  { value: "auto", label: "自动" },
  { value: "2", label: "BIN" },
  { value: "8", label: "OCT" },
  { value: "10", label: "DEC" },
  { value: "16", label: "HEX" },
  { value: "36", label: "BASE36" },
];

function normalizeInput(value: string): string {
  return value.trim().replace(/_/g, "");
}

function digitValue(char: string): number {
  return digits.indexOf(char.toUpperCase());
}

function validateBase(value: string, label: string): number {
  const base = Number.parseInt(value, 10);
  if (!Number.isInteger(base) || String(base) !== value.trim()) {
    throw new Error(`${label}必须是 2 到 36 之间的整数`);
  }
  if (base < 2 || base > 36) {
    throw new Error(`${label}必须在 2 到 36 之间`);
  }
  return base;
}

function stripSign(value: string): { negative: boolean; body: string } {
  if (value.startsWith("-")) {
    return { negative: true, body: value.slice(1) };
  }
  if (value.startsWith("+")) {
    return { negative: false, body: value.slice(1) };
  }
  return { negative: false, body: value };
}

function stripKnownPrefix(value: string, base: number): string {
  const lower = value.toLowerCase();
  if (base === 2 && lower.startsWith("0b")) return value.slice(2);
  if (base === 8 && lower.startsWith("0o")) return value.slice(2);
  if (base === 16 && lower.startsWith("0x")) return value.slice(2);
  return value;
}

function detectBase(value: string): number {
  const { body } = stripSign(normalizeInput(value));
  const lower = body.toLowerCase();

  if (lower.startsWith("0b")) return 2;
  if (lower.startsWith("0o")) return 8;
  if (lower.startsWith("0x")) return 16;

  const bodyWithoutPoint = body.replace(".", "");
  const maxDigit = [...bodyWithoutPoint].reduce(
    (max, char) => Math.max(max, digitValue(char)),
    -1
  );

  if (maxDigit < 0) return 10;
  if (maxDigit <= 9) return 10;
  if (maxDigit <= 15) return 16;
  return 36;
}

function parseBaseSelection(selection: BaseSelection, value: string): number {
  return selection === "auto"
    ? detectBase(value)
    : validateBase(selection, "输入进制");
}

function parseNumber(value: string, base: number): ParsedNumber {
  const normalized = normalizeInput(value);
  if (!normalized) {
    throw new Error("请输入数字");
  }

  const { negative, body } = stripSign(normalized);
  const unprefixed = stripKnownPrefix(body, base);
  const parts = unprefixed.split(".");

  if (parts.length > 2) {
    throw new Error("小数点只能出现一次");
  }

  const [integerPart = "", fractionalPart = ""] = parts;
  if (!integerPart && !fractionalPart) {
    throw new Error("请输入有效数字");
  }

  let integer = ZERO;
  for (const char of integerPart || "0") {
    const valueOfDigit = digitValue(char);
    if (valueOfDigit < 0 || valueOfDigit >= base) {
      throw new Error(`字符 "${char}" 不属于 ${base} 进制`);
    }
    integer = integer * BigInt(base) + BigInt(valueOfDigit);
  }

  let numerator = ZERO;
  let denominator = ONE;
  for (const char of fractionalPart) {
    const valueOfDigit = digitValue(char);
    if (valueOfDigit < 0 || valueOfDigit >= base) {
      throw new Error(`字符 "${char}" 不属于 ${base} 进制`);
    }
    numerator = numerator * BigInt(base) + BigInt(valueOfDigit);
    denominator *= BigInt(base);
  }

  return { negative, integer, numerator, denominator };
}

function stringifyInteger(value: bigint, base: number): string {
  if (value === ZERO) return "0";

  const radix = BigInt(base);
  let current = value;
  let output = "";

  while (current > ZERO) {
    const remainder = Number(current % radix);
    output = digits[remainder] + output;
    current /= radix;
  }

  return output;
}

function stringifyFraction(
  numerator: bigint,
  denominator: bigint,
  base: number,
  precision: number
): string {
  if (numerator === ZERO || precision <= 0) return "";

  const radix = BigInt(base);
  let current = numerator;
  let output = "";

  for (let i = 0; i < precision && current !== ZERO; i++) {
    current *= radix;
    const digit = current / denominator;
    current %= denominator;
    output += digits[Number(digit)];
  }

  return output ? `.${output}` : "";
}

function formatPrefix(base: number): string {
  if (base === 2) return "0b";
  if (base === 8) return "0o";
  if (base === 16) return "0x";
  return "";
}

function convertNumber(
  value: string,
  inputBase: number,
  outputBase: number,
  precision: number,
  showPrefix: boolean,
  uppercase: boolean
): string {
  const parsed = parseNumber(value, inputBase);
  const isZero = parsed.integer === ZERO && parsed.numerator === ZERO;
  const sign = parsed.negative && !isZero ? "-" : "";
  const prefix = showPrefix ? formatPrefix(outputBase) : "";
  const integer = stringifyInteger(parsed.integer, outputBase);
  const fraction = stringifyFraction(
    parsed.numerator,
    parsed.denominator,
    outputBase,
    precision
  );
  const output = `${sign}${prefix}${integer}${fraction}`;

  return uppercase ? output.toUpperCase() : output.toLowerCase();
}

function convertBatch(
  input: string,
  inputBaseSelection: BaseSelection,
  outputBaseSelection: string,
  precision: number,
  showPrefix: boolean,
  uppercase: boolean
): ConvertResult {
  if (!input.trim()) {
    return { output: "", error: "" };
  }

  try {
    const outputBase = validateBase(outputBaseSelection, "输出进制");
    const lines = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

    const output = lines
      .map((line, index) => {
        if (!line.trim()) return "";
        const inputBase = parseBaseSelection(inputBaseSelection, line);
        try {
          return convertNumber(
            line,
            inputBase,
            outputBase,
            precision,
            showPrefix,
            uppercase
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "转换失败";
          throw new Error(`第 ${index + 1} 行：${message}`);
        }
      })
      .join("\n");

    return { output, error: "" };
  } catch (error) {
    return {
      output: "",
      error: error instanceof Error ? error.message : "转换失败",
    };
  }
}

function countLines(value: string): number {
  return value ? value.split(/\r\n|\r|\n/).length : 0;
}

function BasePicker({
  label,
  value,
  onChange,
  allowAuto,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowAuto?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1 rounded-lg bg-background p-1 shadow-sm">
        {quickBases
          .filter((base) => allowAuto || base.value !== "auto")
          .map((base) => (
            <Button
              key={base.value}
              variant={value === base.value ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={() => onChange(base.value)}
            >
              {base.label}
            </Button>
          ))}
      </div>
      <Input
        value={value === "auto" ? "" : value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        placeholder="自定义"
        className="h-8 w-20 text-xs"
      />
    </div>
  );
}

export function BaseConverter() {
  const [input, setInput] = useState(sampleInput);
  const [inputBase, setInputBase] = useState<BaseSelection>("auto");
  const [outputBase, setOutputBase] = useState("10");
  const [precision, setPrecision] = useState(12);
  const [showPrefix, setShowPrefix] = useState(false);
  const [uppercase, setUppercase] = useState(true);

  const result = useMemo(
    () =>
      convertBatch(
        input,
        inputBase,
        outputBase,
        precision,
        showPrefix,
        uppercase
      ),
    [input, inputBase, outputBase, precision, showPrefix, uppercase]
  );

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard permission failures
    }
  };

  const handleDownload = () => {
    if (!result.output) return;
    const blob = new Blob([result.output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `base-${outputBase}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSwap = () => {
    if (!result.output || inputBase === "auto") return;
    setInput(result.output);
    setInputBase(outputBase);
    setOutputBase(inputBase);
  };

  const precisionLabel = precision === 0 ? "不保留小数" : `${precision} 位小数`;

  return (
    <div className="w-full space-y-4">
      <Card className="border-0 bg-muted/30 p-3 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BasePicker
            label="输入进制"
            value={inputBase}
            onChange={setInputBase}
            allowAuto
          />

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleSwap}
            disabled={!result.output || inputBase === "auto"}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            交换
          </Button>

          <BasePicker
            label="输出进制"
            value={outputBase}
            onChange={setOutputBase}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant={showPrefix ? "secondary" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowPrefix((value) => !value)}
          >
            显示前缀 {showPrefix ? "开" : "关"}
          </Button>
          <Button
            variant={uppercase ? "secondary" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setUppercase((value) => !value)}
          >
            字母大写 {uppercase ? "开" : "关"}
          </Button>
          <div className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1">
            <span className="text-xs text-muted-foreground">{precisionLabel}</span>
            <Input
              type="number"
              min={0}
              max={64}
              value={precision}
              onChange={(event) =>
                setPrecision(
                  Math.min(64, Math.max(0, Number(event.target.value) || 0))
                )
              }
              className="h-6 w-16 text-xs"
            />
          </div>
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
                <Binary className="h-4 w-4" />
                原始数字
              </h2>
              <p className="text-xs text-muted-foreground">
                每行一个数字，支持 0b / 0o / 0x 前缀和小数
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {countLines(input)} 行
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setInput(sampleInput)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
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
                onClick={() => setInput("")}
                disabled={!input}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="例如：0xFF、1010、35.75"
            className="h-[420px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            spellCheck={false}
          />
        </Card>

        <Card className="flex flex-col overflow-hidden border bg-card py-0 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Hash className="h-4 w-4" />
                转换结果
              </h2>
              <p className="text-xs text-muted-foreground">
                输出为 {outputBase || "-"} 进制，空行会原样保留
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {countLines(result.output)} 行
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
            className="h-[420px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            spellCheck={false}
          />
        </Card>
      </div>
    </div>
  );
}
