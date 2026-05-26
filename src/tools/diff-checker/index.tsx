"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, X, ArrowLeftRight, Eye, Columns2 } from "lucide-react";
import { diffLines, diffWords, type Change } from "diff";

type ViewMode = "unified" | "side-by-side";

// ====== 工具：去除前后空白行 ======
function trimTrailingEmptyLines(text: string): string {
  return text.replace(/\n+$/, "").replace(/^\n+/, "");
}

// ====== 并排视图的行对 ======
interface SideRow {
  type: "unchanged" | "added" | "removed" | "modified";
  oldLine?: string;
  oldNum?: number;
  newLine?: string;
  newNum?: number;
  oldWordDiff?: React.ReactNode[];
  newWordDiff?: React.ReactNode[];
}

function buildSideBySide(changes: Change[]): SideRow[] {
  const rows: SideRow[] = [];
  let oldNum = 0;
  let newNum = 0;

  for (let i = 0; i < changes.length; i++) {
    const ch = changes[i];
    const lines = ch.value.replace(/\n$/, "").split("\n");

    if (!ch.added && !ch.removed) {
      // unchanged
      for (const line of lines) {
        oldNum++; newNum++;
        rows.push({ type: "unchanged", oldLine: line, oldNum, newLine: line, newNum });
      }
    } else if (ch.removed) {
      // removed — 检查下一个是否是 added（表示修改）
      const next = changes[i + 1];
      if (next && next.added) {
        const addedLines = next.value.replace(/\n$/, "").split("\n");
        const maxLen = Math.max(lines.length, addedLines.length);
        for (let j = 0; j < maxLen; j++) {
          const ol = lines[j] ?? "";
          const nl = addedLines[j] ?? "";
          oldNum++; newNum++;
          if (ol && nl) {
            rows.push({
              type: "modified",
              oldLine: ol, oldNum,
              newLine: nl, newNum,
              oldWordDiff: wordDiffHighlight(ol, nl, "old"),
              newWordDiff: wordDiffHighlight(ol, nl, "new"),
            });
          } else if (ol) {
            rows.push({ type: "removed", oldLine: ol, oldNum, newNum });
          } else {
            rows.push({ type: "added", newLine: nl, oldNum, newNum });
          }
        }
        i++; // skip next
      } else {
        for (const line of lines) {
          oldNum++;
          rows.push({ type: "removed", oldLine: line, oldNum, newNum: undefined });
        }
      }
    } else if (ch.added) {
      for (const line of lines) {
        newNum++;
        rows.push({ type: "added", newLine: line, oldNum: undefined, newNum });
      }
    }
  }

  return rows;
}

// ====== 行内词级高亮 ======
function wordDiffHighlight(oldStr: string, newStr: string, side: "old" | "new"): React.ReactNode[] {
  const words = diffWords(oldStr, newStr);
  return words
    .filter((w) => side === "old" ? !w.added : !w.removed)
    .map((w, i) => {
      let cls = "";
      if (side === "old" && w.removed) cls = "bg-red-300/60 dark:bg-red-700/60 rounded-sm";
      if (side === "new" && w.added) cls = "bg-green-300/60 dark:bg-green-700/60 rounded-sm";
      return (
        <span key={i} className={cls}>
          {w.value}
        </span>
      );
    });
}

// ====== 统计 ======
interface DiffStats { added: number; removed: number; modified: number; unchanged: number }

function calcStats(changes: Change[]): DiffStats {
  const stats: DiffStats = { added: 0, removed: 0, modified: 0, unchanged: 0 };
  for (let i = 0; i < changes.length; i++) {
    const ch = changes[i];
    const lineCount = (ch.value.match(/\n/g) || []).length - (ch.value.endsWith("\n") ? 1 : 0) + (ch.value ? 1 : 0);
    if (!ch.added && !ch.removed) {
      stats.unchanged += lineCount;
    } else if (ch.removed) {
      if (changes[i + 1]?.added) {
        const nextLines = (changes[i + 1].value.match(/\n/g) || []).length - (changes[i + 1].value.endsWith("\n") ? 1 : 0) + (changes[i + 1].value ? 1 : 0);
        stats.modified += Math.max(lineCount, nextLines);
        i++;
      } else {
        stats.removed += lineCount;
      }
    } else if (ch.added) {
      stats.added += lineCount;
    }
  }
  return stats;
}

// ====== 组件 ======

export function DiffChecker() {
  const [oldText, setOldText] = useState("");
  const [newText, setNewText] = useState("");
  const [compareClicked, setCompareClicked] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("unified");
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);

  // 对比
  const diffResult = useMemo(() => {
    if (!compareClicked) return null;
    let o = oldText;
    let n = newText;
    if (ignoreWhitespace) {
      o = o.replace(/[ \t]+/g, " ").trim();
      n = n.replace(/[ \t]+/g, " ").trim();
    }
    if (ignoreCase) {
      o = o.toLowerCase();
      n = n.toLowerCase();
    }
    if (!o && !n) return null;
    const changes = diffLines(o, n);
    const sideRows = buildSideBySide(changes);
    const stats = calcStats(changes);
    return { changes, sideRows, stats };
  }, [oldText, newText, compareClicked, ignoreWhitespace, ignoreCase]);

  const handleCompare = () => setCompareClicked(true);

  const handleClear = () => {
    setOldText("");
    setNewText("");
    setCompareClicked(false);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
  };

  const handleCopyResult = async () => {
    if (!diffResult) return;
    const text = diffResult.changes
      .map((ch) => {
        const prefix = ch.added ? "+ " : ch.removed ? "- " : "  ";
        return ch.value
          .split("\n")
          .filter((l, i, arr) => i < arr.length - 1 || l !== "")
          .map((l) => prefix + l)
          .join("\n");
      })
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
  };

  const handleSwap = () => {
    setOldText(newText);
    setNewText(oldText);
    setCompareClicked(false);
  };

  const labelClass = "text-xs font-medium text-muted-foreground";

  return (
    <div className="w-full space-y-4">
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-lg font-semibold">📊 文本差异对比</h2>
        <p className="text-sm text-muted-foreground">
          粘贴两端文本，对比差异，高亮新增、删除和修改
        </p>
      </div>

      {/* 原始 & 对比文本 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 原始文本 */}
        <Card className="flex flex-col overflow-hidden border-2 border-dashed border-red-500/30 bg-card py-0">
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
            <div>
              <h3 className="text-sm font-semibold">📄 原始文本</h3>
              <p className="text-xs text-muted-foreground">修改前的文本</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => handleCopy(oldText)}
              disabled={!oldText}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <textarea
            value={oldText}
            onChange={(e) => { setOldText(e.target.value); setCompareClicked(false); }}
            placeholder="在此粘贴原始文本..."
            className="h-[300px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            spellCheck={false}
          />
        </Card>

        {/* 对比文本 */}
        <Card className="flex flex-col overflow-hidden border-2 border-dashed border-green-500/30 bg-card py-0">
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
            <div>
              <h3 className="text-sm font-semibold">📝 对比文本</h3>
              <p className="text-xs text-muted-foreground">修改后的文本</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => handleCopy(newText)}
              disabled={!newText}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <textarea
            value={newText}
            onChange={(e) => { setNewText(e.target.value); setCompareClicked(false); }}
            placeholder="在此粘贴对比文本..."
            className="h-[300px] w-full resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            spellCheck={false}
          />
        </Card>
      </div>

      {/* 操作栏 */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={handleCompare} size="sm" disabled={compareClicked}>
          🔍 开始对比
        </Button>
        <Button variant="outline" size="sm" onClick={handleSwap}>
          <ArrowLeftRight className="mr-1 h-3.5 w-3.5" /> 交换
        </Button>
        <Button variant="outline" size="sm" onClick={handleClear} disabled={!oldText && !newText}>
          <X className="mr-1 h-3.5 w-3.5" /> 清空
        </Button>

        {diffResult && (
          <>
            <span className="mx-1 h-5 w-px bg-border" />
            <Button
              variant={viewMode === "unified" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setViewMode("unified")}
            >
              <Eye className="mr-1 h-3.5 w-3.5" /> 统一视图
            </Button>
            <Button
              variant={viewMode === "side-by-side" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setViewMode("side-by-side")}
            >
              <Columns2 className="mr-1 h-3.5 w-3.5" /> 并排对比
            </Button>

            <span className="mx-1 h-5 w-px bg-border" />
            <Button
              variant={ignoreWhitespace ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIgnoreWhitespace(!ignoreWhitespace)}
            >
              忽略空白
            </Button>
            <Button
              variant={ignoreCase ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIgnoreCase(!ignoreCase)}
            >
              忽略大小写
            </Button>
          </>
        )}
      </div>

      {/* 统计 */}
      {diffResult && (
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <span className="rounded-md bg-green-100 px-2.5 py-0.5 font-mono text-green-800 dark:bg-green-950 dark:text-green-300">
            +{diffResult.stats.added} 新增
          </span>
          <span className="rounded-md bg-red-100 px-2.5 py-0.5 font-mono text-red-800 dark:bg-red-950 dark:text-red-300">
            -{diffResult.stats.removed} 删除
          </span>
          <span className="rounded-md bg-yellow-100 px-2.5 py-0.5 font-mono text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
            ~{diffResult.stats.modified} 修改
          </span>
          <span className="rounded-md bg-muted px-2.5 py-0.5 font-mono text-muted-foreground">
            {diffResult.stats.unchanged} 未变
          </span>
        </div>
      )}

      {/* 差异结果 */}
      {diffResult && (
        <Card className="flex flex-col overflow-hidden border-2 border-dashed border-blue-500/30 bg-card py-0">
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
            <div>
              <h3 className="text-sm font-semibold">📋 差异结果</h3>
              <p className="text-xs text-muted-foreground">
                {viewMode === "unified" ? "统一视图" : "并排对比"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleCopyResult}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="max-h-[600px] overflow-auto bg-muted/10">
            {viewMode === "unified" ? (
              <UnifiedView changes={diffResult.changes} />
            ) : (
              <SideBySideView rows={diffResult.sideRows} />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ====== 统一视图 ======

function UnifiedView({ changes }: { changes: Change[] }) {
  let lineNum = 0;
  return (
    <div className="font-mono text-sm leading-relaxed">
      {changes.map((ch, ci) => {
        const lines = ch.value.replace(/\n$/, "").split("\n");
        let bg = "";
        let marker = " ";
        if (ch.added) { bg = "bg-green-50 dark:bg-green-950/20"; marker = "+"; }
        else if (ch.removed) { bg = "bg-red-50 dark:bg-red-950/20"; marker = "-"; }
        else { bg = ""; marker = " "; }

        return (
          <div key={ci} className={bg}>
            {lines.map((line, li) => {
              if (!ch.added && !ch.removed) lineNum++;
              const num = !ch.added && !ch.removed ? lineNum : "";
              const addNum = ch.added ? undefined : num;
              const removeNum = ch.removed ? undefined : num;
              return (
                <div
                  key={li}
                  className="flex border-b border-border/30 px-3 py-0.5 last:border-b-0"
                >
                  <span className="w-14 shrink-0 select-none text-right text-xs text-muted-foreground/60">
                    {num}
                  </span>
                  <span className="mr-2 w-4 shrink-0 select-none text-muted-foreground/60">
                    {marker}
                  </span>
                  <span className="whitespace-pre-wrap break-all">{line}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ====== 并排视图 ======

function SideBySideView({ rows }: { rows: SideRow[] }) {
  return (
    <div className="font-mono text-sm leading-relaxed">
      {/* Header */}
      <div className="flex border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
        <div className="w-1/2 border-r border-border px-4 py-1.5">📄 原始文本</div>
        <div className="w-1/2 px-4 py-1.5">📝 对比文本</div>
      </div>

      {rows.map((row, i) => {
        let oldBg = "";
        let newBg = "";
        switch (row.type) {
          case "added":
            newBg = "bg-green-50 dark:bg-green-950/20"; break;
          case "removed":
            oldBg = "bg-red-50 dark:bg-red-950/20"; break;
          case "modified":
            oldBg = "bg-red-50 dark:bg-red-950/20";
            newBg = "bg-green-50 dark:bg-green-950/20"; break;
        }

        return (
          <div key={i} className="flex border-b border-border/30 last:border-b-0">
            {/* 旧 */}
            <div className={`flex w-1/2 min-w-0 border-r border-border/30 ${oldBg}`}>
              <span className="w-10 shrink-0 select-none px-1 text-right text-xs text-muted-foreground/60">
                {row.oldNum ?? ""}
              </span>
              <span className="whitespace-pre-wrap break-all px-2">
                {row.oldWordDiff ?? row.oldLine ?? ""}
              </span>
            </div>
            {/* 新 */}
            <div className={`flex w-1/2 min-w-0 ${newBg}`}>
              <span className="w-10 shrink-0 select-none px-1 text-right text-xs text-muted-foreground/60">
                {row.newNum ?? ""}
              </span>
              <span className="whitespace-pre-wrap break-all px-2">
                {row.newWordDiff ?? row.newLine ?? ""}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
