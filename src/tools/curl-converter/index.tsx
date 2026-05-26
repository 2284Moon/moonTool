"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Play } from "lucide-react";

type Target = "curl" | "fetch" | "axios" | "python" | "java" | "go";

interface ParsedCurl {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

const sample = `curl 'https://api.example.com/users' \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer token' \\
  --data '{"name":"moonTool","role":"dev"}'`;

const shellSplit = (input: string) => {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escape = false;
  for (const char of input.replace(/\\\r?\n/g, " ")) {
    if (escape) {
      current += char;
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if ((char === "'" || char === '"') && !quote) {
      quote = char;
      continue;
    }
    if (char === quote) {
      quote = null;
      continue;
    }
    if (/\s/.test(char) && !quote) {
      if (current) tokens.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) tokens.push(current);
  return tokens;
};

const parseCurl = (input: string): ParsedCurl => {
  const tokens = shellSplit(input.trim()).filter((token) => token !== "curl");
  const parsed: ParsedCurl = { method: "GET", url: "", headers: {}, body: "" };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];
    if (!token.startsWith("-") && !parsed.url) {
      parsed.url = token;
      continue;
    }
    if ((token === "-X" || token === "--request") && next) {
      parsed.method = next.toUpperCase();
      i++;
      continue;
    }
    if ((token === "-H" || token === "--header") && next) {
      const index = next.indexOf(":");
      if (index > -1) parsed.headers[next.slice(0, index).trim()] = next.slice(index + 1).trim();
      i++;
      continue;
    }
    if (["-d", "--data", "--data-raw", "--data-binary", "--data-urlencode"].includes(token) && next) {
      parsed.body = next;
      if (parsed.method === "GET") parsed.method = "POST";
      i++;
    }
  }
  return parsed;
};

const js = (value: unknown) => JSON.stringify(value, null, 2);
const quote = (value: string) => JSON.stringify(value);

const codeFor = (parsed: ParsedCurl, target: Target) => {
  const headers = js(parsed.headers);
  const hasBody = parsed.body && !["GET", "HEAD"].includes(parsed.method);
  if (target === "curl") return `curl ${quote(parsed.url)} -X ${parsed.method}${Object.entries(parsed.headers).map(([k, v]) => ` \\\n  -H ${quote(`${k}: ${v}`)}`).join("")}${hasBody ? ` \\\n  --data ${quote(parsed.body)}` : ""}`;
  if (target === "fetch") return `const response = await fetch(${quote(parsed.url)}, {\n  method: ${quote(parsed.method)},\n  headers: ${headers}${hasBody ? `,\n  body: ${quote(parsed.body)}` : ""}\n});\nconst data = await response.text();\nconsole.log(data);`;
  if (target === "axios") return `import axios from "axios";\n\nconst response = await axios({\n  url: ${quote(parsed.url)},\n  method: ${quote(parsed.method.toLowerCase())},\n  headers: ${headers}${hasBody ? `,\n  data: ${quote(parsed.body)}` : ""}\n});\nconsole.log(response.data);`;
  if (target === "python") return `import requests\n\nresponse = requests.request(\n    ${quote(parsed.method)},\n    ${quote(parsed.url)},\n    headers=${JSON.stringify(parsed.headers)}${hasBody ? `,\n    data=${quote(parsed.body)}` : ""}\n)\nprint(response.text)`;
  if (target === "java") return `HttpClient client = HttpClient.newHttpClient();\nHttpRequest request = HttpRequest.newBuilder()\n    .uri(URI.create(${quote(parsed.url)}))${Object.entries(parsed.headers).map(([k, v]) => `\n    .header(${quote(k)}, ${quote(v)})`).join("")}\n    .method(${quote(parsed.method)}, ${hasBody ? `HttpRequest.BodyPublishers.ofString(${quote(parsed.body)})` : "HttpRequest.BodyPublishers.noBody()"})\n    .build();\nHttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());\nSystem.out.println(response.body());`;
  return `package main\n\nimport (\n  "fmt"\n  "io"\n  "net/http"\n  "strings"\n)\n\nfunc main() {\n  req, _ := http.NewRequest(${quote(parsed.method)}, ${quote(parsed.url)}, ${hasBody ? `strings.NewReader(${quote(parsed.body)})` : "nil"})${Object.entries(parsed.headers).map(([k, v]) => `\n  req.Header.Set(${quote(k)}, ${quote(v)})`).join("")}\n  res, _ := http.DefaultClient.Do(req)\n  defer res.Body.Close()\n  body, _ := io.ReadAll(res.Body)\n  fmt.Println(string(body))\n}`;
};

export function CurlConverter() {
  const [input, setInput] = useState(sample);
  const [target, setTarget] = useState<Target>("fetch");
  const [response, setResponse] = useState("");
  const parsed = useMemo(() => parseCurl(input), [input]);
  const output = useMemo(() => codeFor(parsed, target), [parsed, target]);

  const send = async () => {
    setResponse("请求中...");
    try {
      const res = await fetch(parsed.url, {
        method: parsed.method,
        headers: parsed.headers,
        body: parsed.body && !["GET", "HEAD"].includes(parsed.method) ? parsed.body : undefined,
      });
      setResponse(`HTTP ${res.status}\n\n${await res.text()}`);
    } catch (error) {
      setResponse((error as Error).message);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="overflow-hidden border-2 py-0">
        <div className="border-b bg-muted/50 px-4 py-2">
          <h2 className="text-sm font-semibold">cURL 输入</h2>
          <p className="text-xs text-muted-foreground">支持常见 -X、-H、--data 参数</p>
        </div>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} className="h-[360px] w-full resize-none bg-transparent p-4 font-mono text-sm outline-none" />
        <div className="grid grid-cols-2 gap-2 border-t p-4 text-xs md:grid-cols-4">
          <div><span className="text-muted-foreground">Method</span><p className="font-mono">{parsed.method}</p></div>
          <div className="col-span-2"><span className="text-muted-foreground">URL</span><p className="truncate font-mono">{parsed.url || "-"}</p></div>
          <div><span className="text-muted-foreground">Headers</span><p className="font-mono">{Object.keys(parsed.headers).length}</p></div>
        </div>
      </Card>

      <Card className="overflow-hidden border-2 py-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/50 px-4 py-2">
          <div>
            <h2 className="text-sm font-semibold">转换结果</h2>
            <p className="text-xs text-muted-foreground">复制代码或直接在浏览器发起请求</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {(["curl", "fetch", "axios", "python", "java", "go"] as Target[]).map((item) => (
              <Button key={item} size="sm" variant={target === item ? "secondary" : "outline"} onClick={() => setTarget(item)}>{item}</Button>
            ))}
          </div>
        </div>
        <textarea value={output} readOnly className="h-[360px] w-full resize-none bg-muted/20 p-4 font-mono text-sm outline-none" />
        <div className="flex gap-2 border-t p-4">
          <Button size="sm" onClick={() => navigator.clipboard.writeText(output)}><Copy className="mr-1 h-3.5 w-3.5" /> 复制代码</Button>
          <Button size="sm" variant="outline" onClick={send} disabled={!parsed.url}><Play className="mr-1 h-3.5 w-3.5" /> 发起请求</Button>
        </div>
        {response && <pre className="max-h-56 overflow-auto border-t bg-muted/30 p-4 text-xs">{response}</pre>}
      </Card>
    </div>
  );
}
