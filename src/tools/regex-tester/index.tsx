"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, X } from "lucide-react";

// ====== 内置正则模板 ======

interface RegexTemplate {
  name: string;
  pattern: string;
  flags?: string;
  description: string;
}

const TEMPLATES: RegexTemplate[] = [
  { name: "身份证", pattern: "\\d{17}[\\dXx]", flags: "", description: "18 位身份证号" },
  { name: "手机号", pattern: "1[3-9]\\d{9}", flags: "", description: "中国大陆手机号" },
  { name: "Email", pattern: "[\\w.+-]+@[\\w.-]+\\.\\w{2,}", flags: "i", description: "电子邮箱地址" },
  { name: "网址", pattern: "https?://[\\w.-]+(:\\d+)?(/[\\w./%+?#&=-]*)?", flags: "i", description: "HTTP(S) URL" },
  { name: "车牌号", pattern: "[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼宁][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]", flags: "", description: "中国大陆车牌" },
  { name: "IP 地址", pattern: "((25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)", flags: "", description: "IPv4 地址" },
  { name: "日期", pattern: "\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])", flags: "", description: "YYYY-MM-DD 格式" },
  { name: "金额", pattern: "\\d+(\\.\\d{1,2})?", flags: "", description: "人民币金额" },
  { name: "中文", pattern: "[\\u4e00-\\u9fa5]+", flags: "g", description: "匹配中文字符" },
  { name: "邮编", pattern: "\\d{6}", flags: "", description: "6 位邮政编码" },
  { name: "QQ", pattern: "[1-9]\\d{4,10}", flags: "", description: "QQ 号码" },
  { name: "微信号", pattern: "[a-zA-Z][a-zA-Z\\d_-]{5,19}", flags: "", description: "微信号 6-20 位" },
  { name: "Hex 颜色", pattern: "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})", flags: "", description: "十六进制颜色码" },
  { name: "MD5", pattern: "[a-fA-F0-9]{32}", flags: "", description: "32 位 MD5 哈希" },
  { name: "UUID", pattern: "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", flags: "", description: "标准 UUID 格式" },
];

// ====== 工具 ======

interface MatchInfo {
  index: number;
  length: number;
  match: string;
  groups: (string | undefined)[];
}

function findAllMatches(regex: RegExp, text: string): MatchInfo[] {
  const matches: MatchInfo[] = [];
  if (!regex.global) {
    // 非全局匹配，只执行一次
    const m = regex.exec(text);
    if (m) {
      matches.push({
        index: m.index,
        length: m[0].length,
        match: m[0],
        groups: m.slice(1),
      });
    }
  } else {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      matches.push({
        index: m.index,
        length: m[0].length,
        match: m[0],
        groups: m.slice(1),
      });
      if (m[0].length === 0) {
        regex.lastIndex++; // 防止死循环
      }
    }
  }
  return matches;
}

/** 把匹配位置拆成 [text, highlighted?] 片段 */
function splitHighlighted(text: string, matches: MatchInfo[]): { text: string; highlight: boolean; index: number }[] {
  if (matches.length === 0) return [{ text, highlight: false, index: 0 }];
  const segments: { text: string; highlight: boolean; index: number }[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.index > cursor) {
      segments.push({ text: text.slice(cursor, m.index), highlight: false, index: cursor });
    }
    segments.push({ text: m.match, highlight: true, index: m.index });
    cursor = m.index + m.length;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlight: false, index: cursor });
  }
  return segments;
}

// ====== 组件 ======

export function RegexTester() {
  const [pattern, setPattern] = useState("");
  const [testText, setTestText] = useState("");
  const [flags, setFlags] = useState("g");
  const [regexError, setRegexError] = useState("");
  const [exactMatch, setExactMatch] = useState(false); // 默认关闭：从文本中查找，而非精确匹配

  // 编译正则（精确匹配时自动包裹 ^...$）
  const regex = useMemo(() => {
    setRegexError("");
    if (!pattern) return null;
    try {
      let p = pattern;
      if (exactMatch) {
        if (!p.startsWith("^")) p = "^" + p;
        if (!p.endsWith("$")) p = p + "$";
      }
      return new RegExp(p, flags);
    } catch (e) {
      setRegexError((e as Error).message);
      return null;
    }
  }, [pattern, flags, exactMatch]);

  // 执行匹配
  const matches = useMemo(() => {
    if (!regex || !testText) return [];
    try {
      const m = findAllMatches(new RegExp(regex.source, regex.flags), testText);
      setRegexError("");
      return m;
    } catch (e) {
      setRegexError((e as Error).message);
      return [];
    }
  }, [regex, testText]);

  // 高亮片段
  const highlighted = useMemo(
    () => splitHighlighted(testText, matches),
    [testText, matches]
  );

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  };

  const handleClear = () => {
    setPattern("");
    setTestText("");
    setFlags("g");
    setRegexError("");
  };

  const handleTemplate = (tpl: RegexTemplate) => {
    setPattern(tpl.pattern);
    setFlags(tpl.flags || "g");
    setRegexError("");
  };

  const toggleFlag = (f: string) => {
    setFlags((prev) => (prev.includes(f) ? prev.replace(f, "") : prev + f));
  };

  const flagButtons = ["g", "i", "m", "s", "u"] as const;
  const flagLabels: Record<string, string> = {
    g: "全局", i: "忽略大小写", m: "多行", s: "dotAll", u: "Unicode",
  };

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">🔍 正则表达式测试器</h2>
        <p className="text-sm text-muted-foreground">
          输入正则和测试文本，实时高亮匹配结果
        </p>
      </div>

      {/* 正则输入 */}
      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">📐 正则表达式</h3>
          <Button variant="outline" size="sm" onClick={handleClear} disabled={!pattern && !testText}>
            <X className="mr-1 h-3.5 w-3.5" /> 清空
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-lg text-muted-foreground">/</span>
          <input
            className="h-10 flex-1 rounded-lg border border-input bg-background px-3 font-mono text-sm focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="输入正则表达式，如 \d+"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            style={{ minWidth: 200 }}
            spellCheck={false}
          />
          <span className="font-mono text-lg text-muted-foreground">/</span>
          {flagButtons.map((f) => (
            <Button
              key={f}
              variant={flags.includes(f) ? "secondary" : "outline"}
              size="sm"
              className="h-9 min-w-10 font-mono text-xs"
              onClick={() => toggleFlag(f)}
              title={flagLabels[f]}
            >
              {f}
            </Button>
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          <Button
            variant={exactMatch ? "secondary" : "outline"}
            size="sm"
            className="h-9 text-xs"
            onClick={() => setExactMatch(!exactMatch)}
            title="精确匹配：自动加 ^$ 锚点，要求整个文本完全匹配。全文搜索：在文本中查找所有匹配子串"
          >
            {exactMatch ? "精确匹配" : "全文搜索"}
          </Button>
        </div>

        {regexError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-mono text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {regexError}
          </div>
        )}
      </Card>

      {/* 常用模板 */}
      <Card className="space-y-3 p-5">
        <h3 className="text-sm font-semibold">📋 常用模板</h3>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((tpl) => (
            <Button
              key={tpl.name}
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleTemplate(tpl)}
              title={tpl.description}
            >
              {tpl.name}
            </Button>
          ))}
        </div>
      </Card>

      {/* 测试文本 */}
      <Card className="flex flex-col overflow-hidden border-2 border-dashed border-blue-500/30 bg-card py-0">
        <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
          <div>
            <h3 className="text-sm font-semibold">📝 测试文本</h3>
            <p className="text-xs text-muted-foreground">
              输入要测试的文本，匹配结果实时高亮
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => handleCopy(testText)}
            disabled={!testText}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        {/* 高亮显示区域 */}
        <div className="min-h-[200px] whitespace-pre-wrap break-all px-4 py-3 font-mono text-sm leading-relaxed">
          {testText ? (
            highlighted.map((seg, i) =>
              seg.highlight ? (
                <mark
                  key={i}
                  className="rounded-sm bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-800 dark:text-yellow-100"
                  title={`匹配位置: ${seg.index}`}
                >
                  {seg.text}
                </mark>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )
          ) : (
            <span className="text-muted-foreground/50">
              在此输入测试文本，匹配内容将以高亮显示...
            </span>
          )}
        </div>
        {/* 编辑用的 textarea（覆盖在上面或放在下方） */}
        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="在此输入测试文本，匹配内容将以高亮显示..."
          className="h-[120px] w-full resize-none border-t bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          spellCheck={false}
        />
      </Card>

      {/* 匹配结果 */}
      <Card className="flex flex-col overflow-hidden border-2 border-dashed border-green-500/30 bg-card py-0">
        <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
          <div>
            <h3 className="text-sm font-semibold">📊 匹配结果</h3>
            <p className="text-xs text-muted-foreground">
              {regex && testText
                ? `${matches.length} 个匹配`
                : "等待输入正则和测试文本"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => handleCopy(JSON.stringify(matches.map((m) => ({ match: m.match, index: m.index, groups: m.groups })), null, 2))}
            disabled={matches.length === 0}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="max-h-[400px] overflow-auto bg-muted/10 px-4 py-3 font-mono text-sm leading-relaxed">
          {matches.length === 0 ? (
            <p className="text-muted-foreground/50">
              {regex && testText ? "未匹配到任何内容" : "—"}
            </p>
          ) : (
            <div className="space-y-3">
              {matches.map((m, i) => (
                <div key={i} className="rounded-lg border border-border/50 bg-background p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      #{i + 1}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      位置: {m.index} – {m.index + m.length}
                    </span>
                  </div>
                  <div className="rounded bg-green-50 px-2 py-1 font-mono text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
                    {m.match}
                  </div>
                  {m.groups.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-border/30 pt-2">
                      {m.groups.map((g, gi) => (
                        <div key={gi} className="flex items-center gap-2 text-xs">
                          <span className="w-16 shrink-0 text-muted-foreground">
                            Group {gi + 1}:
                          </span>
                          <span className="rounded bg-purple-50 px-1.5 py-0.5 font-mono text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            {g ?? "(未匹配)"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* 使用说明 */}
      <Card className="space-y-3 p-5 text-sm leading-relaxed">
        <h3 className="text-sm font-semibold">💡 使用说明</h3>
        <div className="grid grid-cols-1 gap-4 text-muted-foreground md:grid-cols-2">
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <h4 className="font-medium text-foreground">标志位 (Flags)</h4>
            <ul className="space-y-1 text-xs">
              <li><code className="rounded bg-muted px-1 font-mono text-foreground">g</code> — 全局匹配，查找所有匹配项（不开启只返回第一个）</li>
              <li><code className="rounded bg-muted px-1 font-mono text-foreground">i</code> — 忽略英文字母大小写</li>
              <li><code className="rounded bg-muted px-1 font-mono text-foreground">m</code> — 多行模式，<code className="rounded bg-muted px-1 font-mono">^</code> <code className="rounded bg-muted px-1 font-mono">$</code> 匹配每行的开头和结尾</li>
              <li><code className="rounded bg-muted px-1 font-mono text-foreground">s</code> — dotAll，<code className="rounded bg-muted px-1 font-mono">.</code> 可匹配换行符</li>
              <li><code className="rounded bg-muted px-1 font-mono text-foreground">u</code> — Unicode 模式，正确处理 emoji 等 Unicode 字符</li>
            </ul>
          </div>
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <h4 className="font-medium text-foreground">锚点 (Anchors)</h4>
            <ul className="space-y-1 text-xs">
              <li><code className="rounded bg-muted px-1 font-mono text-foreground">^</code> — 匹配文本开头。如 <code className="rounded bg-muted px-1 font-mono">^\d{3}</code> 匹配以 3 位数字开头</li>
              <li><code className="rounded bg-muted px-1 font-mono text-foreground">$</code> — 匹配文本结尾。如 <code className="rounded bg-muted px-1 font-mono">\d{3}$</code> 匹配以 3 位数字结尾</li>
              <li><code className="rounded bg-muted px-1 font-mono text-foreground">^...$</code> — 整段文本精确匹配。适合表单验证（身份证、手机号等）</li>
              <li>不加锚点 — 在文本中搜索子串。适合从大段文字中提取内容</li>
            </ul>
            <div className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-200">
              💡 点击模板时，<strong>精确匹配</strong>开关控制是否自动加 <code className="font-mono">^$</code>。想从长文本中找手机号？关闭精确匹配即可。
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
