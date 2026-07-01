"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  Database,
  Download,
  Eraser,
  FileCode2,
  Minimize2,
  Wand2,
  X,
} from "lucide-react";
import {
  format,
  type IndentStyle,
  type KeywordCase,
  type LogicalOperatorNewline,
  type SqlLanguage,
} from "sql-formatter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SqlMode = "format" | "compact";
type IndentMode = "2" | "4" | "tab";

interface DialectOption {
  id: SqlLanguage;
  label: string;
}

interface FormatResult {
  output: string;
  error: string;
}

const dialects: DialectOption[] = [
  { id: "sql", label: "通用 SQL" },
  { id: "mysql", label: "MySQL" },
  { id: "postgresql", label: "PostgreSQL" },
  { id: "sqlite", label: "SQLite" },
  { id: "transactsql", label: "T-SQL" },
  { id: "plsql", label: "PL/SQL" },
  { id: "bigquery", label: "BigQuery" },
  { id: "spark", label: "Spark" },
];

const sampleSql = `select u.id,u.name,count(o.id) as order_count,sum(o.total) as total_amount from users u left join orders o on o.user_id=u.id where u.status='active' and o.created_at>=date '2026-01-01' group by u.id,u.name having count(o.id)>0 order by total_amount desc;`;

function countLines(text: string): number {
  return text ? text.split(/\r\n|\r|\n/).length : 0;
}

function compactSql(input: string, keepComments: boolean): string {
  let output = "";
  let pendingSpace = false;
  let quote: "'" | '"' | "`" | "]" | null = null;
  let lineComment = false;
  let blockComment = false;

  const pushSpace = () => {
    if (output && !/[([,.;+\-*/%=<>]$/.test(output)) {
      pendingSpace = true;
    }
  };

  const flushSpace = (next: string) => {
    if (pendingSpace && !/^[)\],.;+\-*/%=<>]$/.test(next)) {
      output += " ";
    }
    pendingSpace = false;
  };

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (lineComment) {
      if (char === "\n" || char === "\r") {
        lineComment = false;
        if (keepComments) pushSpace();
      } else if (keepComments) {
        output += char;
      }
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        if (keepComments) output += "*/";
        blockComment = false;
        i++;
        pushSpace();
      } else if (keepComments) {
        output += char;
      }
      continue;
    }

    if (quote) {
      output += char;

      if (quote === "]") {
        if (char === "]") quote = null;
        continue;
      }

      if (char === quote) {
        if ((quote === "'" || quote === '"') && next === quote) {
          output += next;
          i++;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (char === "-" && next === "-") {
      if (keepComments) {
        flushSpace(char);
        output += "--";
      } else {
        pushSpace();
      }
      lineComment = true;
      i++;
      continue;
    }

    if (char === "/" && next === "*") {
      if (keepComments) {
        flushSpace(char);
        output += "/*";
      } else {
        pushSpace();
      }
      blockComment = true;
      i++;
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      flushSpace(char);
      output += char;
      quote = char;
      continue;
    }

    if (char === "[") {
      flushSpace(char);
      output += char;
      quote = "]";
      continue;
    }

    if (/\s/.test(char)) {
      pushSpace();
      continue;
    }

    if (/^[),.;]$/.test(char)) {
      pendingSpace = false;
      output += char;
      continue;
    }

    if (/^[([]$/.test(char)) {
      flushSpace(char);
      output += char;
      pendingSpace = false;
      continue;
    }

    flushSpace(char);
    output += char;
  }

  return output.trim();
}

function processSql(
  input: string,
  mode: SqlMode,
  language: SqlLanguage,
  keywordCase: KeywordCase,
  indentMode: IndentMode,
  indentStyle: IndentStyle,
  logicalOperatorNewline: LogicalOperatorNewline,
  keepComments: boolean
): FormatResult {
  if (!input.trim()) {
    return { output: "", error: "" };
  }

  try {
    if (mode === "compact") {
      return {
        output: compactSql(input, keepComments),
        error: "",
      };
    }

    return {
      output: format(input, {
        language,
        keywordCase,
        dataTypeCase: keywordCase,
        functionCase: keywordCase,
        tabWidth: indentMode === "4" ? 4 : 2,
        useTabs: indentMode === "tab",
        indentStyle,
        logicalOperatorNewline,
        linesBetweenQueries: 1,
        denseOperators: false,
      }),
      error: "",
    };
  } catch (error) {
    return {
      output: "",
      error: error instanceof Error ? error.message : "SQL 处理失败",
    };
  }
}

function getDialectLabel(language: SqlLanguage): string {
  return dialects.find((dialect) => dialect.id === language)?.label ?? language;
}

export function SqlFormatter() {
  const [input, setInput] = useState(sampleSql);
  const [mode, setMode] = useState<SqlMode>("format");
  const [language, setLanguage] = useState<SqlLanguage>("sql");
  const [keywordCase, setKeywordCase] = useState<KeywordCase>("upper");
  const [indentMode, setIndentMode] = useState<IndentMode>("2");
  const [indentStyle, setIndentStyle] = useState<IndentStyle>("standard");
  const [logicalOperatorNewline, setLogicalOperatorNewline] =
    useState<LogicalOperatorNewline>("before");
  const [keepComments, setKeepComments] = useState(true);

  const result = useMemo(
    () =>
      processSql(
        input,
        mode,
        language,
        keywordCase,
        indentMode,
        indentStyle,
        logicalOperatorNewline,
        keepComments
      ),
    [
      input,
      mode,
      language,
      keywordCase,
      indentMode,
      indentStyle,
      logicalOperatorNewline,
      keepComments,
    ]
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
    const blob = new Blob([result.output], { type: "text/sql;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = mode === "compact" ? "compact.sql" : "formatted.sql";
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
            <span className="text-xs font-medium text-muted-foreground">
              处理方式
            </span>
            <div className="flex rounded-lg bg-background p-1 shadow-sm">
              <Button
                variant={mode === "format" ? "default" : "ghost"}
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => setMode("format")}
              >
                <Wand2 className="h-3.5 w-3.5" />
                格式化
              </Button>
              <Button
                variant={mode === "compact" ? "default" : "ghost"}
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => setMode("compact")}
              >
                <Minimize2 className="h-3.5 w-3.5" />
                压缩
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              方言
            </span>
            <div className="flex max-w-full flex-wrap gap-1 rounded-lg bg-background p-1 shadow-sm">
              {dialects.map((dialect) => (
                <Button
                  key={dialect.id}
                  variant={language === dialect.id ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setLanguage(dialect.id)}
                >
                  {dialect.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-background p-1 shadow-sm">
            {(["upper", "lower", "preserve"] as KeywordCase[]).map((item) => (
              <Button
                key={item}
                variant={keywordCase === item ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setKeywordCase(item)}
              >
                {item === "upper"
                  ? "关键字大写"
                  : item === "lower"
                    ? "关键字小写"
                    : "保留大小写"}
              </Button>
            ))}
          </div>

          <div className="flex rounded-lg bg-background p-1 shadow-sm">
            {(["2", "4", "tab"] as IndentMode[]).map((item) => (
              <Button
                key={item}
                variant={indentMode === item ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setIndentMode(item)}
              >
                {item === "tab" ? "Tab 缩进" : `${item} 空格`}
              </Button>
            ))}
          </div>

          <Button
            variant={indentStyle === "tabularRight" ? "secondary" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              setIndentStyle((value) =>
                value === "tabularRight" ? "standard" : "tabularRight"
              )
            }
          >
            对齐字段 {indentStyle === "tabularRight" ? "开" : "关"}
          </Button>

          <Button
            variant={
              logicalOperatorNewline === "before" ? "secondary" : "outline"
            }
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              setLogicalOperatorNewline((value) =>
                value === "before" ? "after" : "before"
              )
            }
          >
            AND/OR 换行前置
          </Button>

          <Button
            variant={keepComments ? "secondary" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setKeepComments((value) => !value)}
          >
            保留注释 {keepComments ? "开" : "关"}
          </Button>
        </div>
      </Card>

      {result.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <strong>SQL 错误：</strong> {result.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col overflow-hidden border bg-card py-0 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Database className="h-4 w-4" />
                原始 SQL
              </h2>
              <p className="text-xs text-muted-foreground">
                当前方言：{getDialectLabel(language)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="bg-muted/60">
                {inputLines} 行
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setInput(sampleSql)}
              >
                <Eraser className="h-3.5 w-3.5" />
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
            placeholder="在此粘贴 SQL..."
            className="h-[460px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            spellCheck={false}
          />
        </Card>

        <Card className="flex flex-col overflow-hidden border bg-card py-0 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <FileCode2 className="h-4 w-4" />
                处理结果
              </h2>
              <p className="text-xs text-muted-foreground">
                {mode === "format"
                  ? "已按当前选项格式化"
                  : keepComments
                    ? "已压缩空白并保留注释"
                    : "已压缩空白并移除注释"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="bg-muted/60">
                {outputLines} 行
              </Badge>
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
            placeholder="处理后的 SQL 将显示在这里..."
            className="h-[460px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            spellCheck={false}
          />
        </Card>
      </div>
    </div>
  );
}
