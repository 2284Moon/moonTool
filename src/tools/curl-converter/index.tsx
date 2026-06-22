"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Check, ArrowRight, Code2, Zap } from "lucide-react";

type InputFormat = "curl-bash" | "curl-cmd" | "powershell" | "fetch" | "node-fetch";

type OutputTarget =
  | "javascript-fetch"
  | "javascript-axios"
  | "node-fetch"
  | "node-axios"
  | "python"
  | "java"
  | "go"
  | "rust"
  | "php"
  | "ruby"
  | "csharp"
  | "kotlin"
  | "swift"
  | "dart";

interface ParsedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

interface OutputOption {
  id: OutputTarget;
  label: string;
  library: string;
  icon: string;
  color: string;
  generate: (req: ParsedRequest) => string;
}

const INPUT_FORMATS: { id: InputFormat; label: string; example: string }[] = [
  {
    id: "curl-bash",
    label: "cURL (bash)",
    example: `curl 'https://api.example.com/users' \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer your-token' \\
  --data '{"name":"moonTool","role":"developer"}'`,
  },
  {
    id: "curl-cmd",
    label: "cURL (cmd)",
    example: `curl "https://api.example.com/users" ^
  -X POST ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer your-token" ^
  --data "{\\"name\\":\\"moonTool\\",\\"role\\":\\"developer\\"}"`,
  },
  {
    id: "powershell",
    label: "PowerShell",
    example: `Invoke-WebRequest -Uri "https://api.example.com/users" \\
  -Method POST \\
  -Headers @{"Authorization"="Bearer your-token"; "Content-Type"="application/json"} \\
  -Body '{"name":"moonTool","role":"developer"}'`,
  },
  {
    id: "fetch",
    label: "fetch",
    example: `fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({name: 'moonTool', role: 'developer'})
})`,
  },
  {
    id: "node-fetch",
    label: "fetch (Node.js)",
    example: `const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({name: 'moonTool', role: 'developer'})
});
const data = await response.json();`,
  },
];

const js = (value: unknown) => JSON.stringify(value, null, 2);
const q = (value: string) => JSON.stringify(value);
const indent = (str: string, spaces: number) => str.split("\n").map((line) => " ".repeat(spaces) + line).join("\n");

// Shell tokenizer
const shellSplit = (input: string): string[] => {
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

// Parse curl command
const parseCurl = (input: string): ParsedRequest => {
  const tokens = shellSplit(input.trim()).filter((t) => t !== "curl");
  const result: ParsedRequest = { method: "GET", url: "", headers: {}, body: "" };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];

    if (!token.startsWith("-") && !result.url) {
      result.url = token;
      continue;
    }

    if ((token === "-X" || token === "--request") && next) {
      result.method = next.toUpperCase();
      i++;
      continue;
    }

    if ((token === "-H" || token === "--header") && next) {
      const idx = next.indexOf(":");
      if (idx > -1) {
        result.headers[next.slice(0, idx).trim()] = next.slice(idx + 1).trim();
      }
      i++;
      continue;
    }

    if (["-d", "--data", "--data-raw", "--data-binary", "--data-urlencode"].includes(token) && next) {
      result.body = next;
      if (result.method === "GET") result.method = "POST";
      i++;
    }
  }

  return result;
};

// Parse PowerShell Invoke-WebRequest
const parsePowershell = (input: string): ParsedRequest => {
  const result: ParsedRequest = { method: "GET", url: "", headers: {}, body: "" };

  const uriMatch = input.match(/-Uri\s+["']([^"']+)["']/i);
  const methodMatch = input.match(/-Method\s+(\w+)/i);
  const bodyMatch = input.match(/-Body\s+["']([\s\S]+?)["']/);
  const headersMatch = input.match(/-Headers\s+@\{([^}]+)\}/i);

  result.url = uriMatch?.[1] || "";
  result.method = methodMatch?.[1]?.toUpperCase() || "GET";
  result.body = bodyMatch?.[1] || "";

  if (headersMatch?.[1]) {
    const pairs = headersMatch[1].match(/["']([^"']+)["']\s*=\s*["']([^"']+)["']/g);
    if (pairs) {
      for (const pair of pairs) {
        const match = pair.match(/["']([^"']+)["']\s*=\s*["']([^"']+)["']/);
        if (match) {
          result.headers[match[1]] = match[2];
        }
      }
    }
  }

  return result;
};

// Parse fetch call
const parseFetch = (input: string): ParsedRequest => {
  const result: ParsedRequest = { method: "GET", url: "", headers: {}, body: "" };

  const urlMatch = input.match(/fetch\s*\(\s*["']([^"']+)["']/);
  const methodMatch = input.match(/method:\s*["'](\w+)["']/);
  const bodyMatch = input.match(/body:\s*(JSON\.stringify\(.+?\)|.+?)[\n,]/);
  const headersBlock = input.match(/headers:\s*\{([\s\S]+?)\}/);

  result.url = urlMatch?.[1] || "";
  result.method = methodMatch?.[1]?.toUpperCase() || "GET";

  if (bodyMatch?.[1]) {
    result.body = bodyMatch[1].replace(/^JSON\.stringify\(\s*/, "").replace(/\s*\)$/, "").trim();
  }

  if (headersBlock?.[1]) {
    const pairs = headersBlock[1].match(/["']([^"']+)["']\s*:\s*["']([^"']+)["']/g);
    if (pairs) {
      for (const pair of pairs) {
        const match = pair.match(/["']([^"']+)["']\s*:\s*["']([^"']+)["']/);
        if (match) {
          result.headers[match[1]] = match[2];
        }
      }
    }
  }

  return result;
};

const parseInput = (input: string, format: InputFormat): ParsedRequest => {
  switch (format) {
    case "curl-bash":
    case "curl-cmd":
      return parseCurl(input);
    case "powershell":
      return parsePowershell(input);
    case "fetch":
    case "node-fetch":
      return parseFetch(input);
    default:
      return parseCurl(input);
  }
};

const hasBody = (req: ParsedRequest) => req.body && !["GET", "HEAD"].includes(req.method);

const generateJavaScriptFetch = (req: ParsedRequest): string => {
  const opts: string[] = [];
  opts.push(`method: ${q(req.method)}`);
  if (Object.keys(req.headers).length > 0) {
    opts.push(`headers: ${js(req.headers)}`);
  }
  if (hasBody(req)) {
    const isJson = req.headers["Content-Type"]?.includes("json");
    opts.push(`body: ${isJson ? `JSON.stringify(${req.body})` : q(req.body)}`);
  }
  return `const response = await fetch(${q(req.url)}, {\n${indent(opts.join(",\n"), 2)}\n});\n\nconst data = await response.json();\nconsole.log(data);`;
};

const generateNodeFetch = (req: ParsedRequest): string => {
  const opts: string[] = [];
  opts.push(`method: ${q(req.method)}`);
  if (Object.keys(req.headers).length > 0) {
    opts.push(`headers: ${js(req.headers)}`);
  }
  if (hasBody(req)) {
    const isJson = req.headers["Content-Type"]?.includes("json");
    opts.push(`body: ${isJson ? `JSON.stringify(${req.body})` : q(req.body)}`);
  }
  return `import fetch from 'node-fetch';\n\nconst response = await fetch(${q(req.url)}, {\n${indent(opts.join(",\n"), 2)}\n});\n\nconst data = await response.json();\nconsole.log(data);`;
};

const generateAxios = (req: ParsedRequest, isNode: boolean): string => {
  const imports = isNode ? `import axios from 'axios';` : `import axios from 'axios';`;
  const config: string[] = [];
  config.push(`url: ${q(req.url)}`);
  config.push(`method: ${q(req.method.toLowerCase())}`);
  if (Object.keys(req.headers).length > 0) {
    config.push(`headers: ${js(req.headers)}`);
  }
  if (hasBody(req)) {
    const isJson = req.headers["Content-Type"]?.includes("json");
    config.push(`data: ${isJson ? req.body : q(req.body)}`);
  }
  return `${imports}\n\nconst response = await axios({\n${indent(config.join(",\n"), 2)}\n});\n\nconsole.log(response.data);`;
};

const generatePython = (req: ParsedRequest): string => {
  const lines: string[] = [`import requests`, ``];
  const kwargs: string[] = [];
  kwargs.push(`url=${q(req.url)}`);
  if (Object.keys(req.headers).length > 0) {
    kwargs.push(`headers=${js(req.headers)}`);
  }
  if (hasBody(req)) {
    const isJson = req.headers["Content-Type"]?.includes("json");
    if (isJson) {
      kwargs.push(`json=${req.body}`);
    } else {
      kwargs.push(`data=${q(req.body)}`);
    }
  }
  lines.push(`response = requests.request(`);
  lines.push(`    method=${q(req.method)},`);
  lines.push(indent(kwargs.join(",\n"), 4));
  lines.push(`)`);
  lines.push(``);
  lines.push(`print(response.status_code)`);
  lines.push(`print(response.json())`);
  return lines.join("\n");
};

const generateJava = (req: ParsedRequest): string => {
  const lines: string[] = [
    `import java.net.URI;`,
    `import java.net.http.HttpClient;`,
    `import java.net.http.HttpRequest;`,
    `import java.net.http.HttpResponse;`,
    ``,
    `HttpClient client = HttpClient.newHttpClient();`,
    ``,
    `HttpRequest request = HttpRequest.newBuilder()`,
    `    .uri(URI.create(${q(req.url)}))`,
  ];

  for (const [key, value] of Object.entries(req.headers)) {
    lines.push(`    .header(${q(key)}, ${q(value)})`);
  }

  if (hasBody(req)) {
    lines.push(`    .method(${q(req.method)}, HttpRequest.BodyPublishers.ofString(${q(req.body)}))`);
  } else {
    lines.push(`    .method(${q(req.method)}, HttpRequest.BodyPublishers.noBody())`);
  }

  lines.push(`    .build();`);
  lines.push(``);
  lines.push(`HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());`);
  lines.push(`System.out.println(response.body());`);

  return lines.join("\n");
};

const generateGo = (req: ParsedRequest): string => {
  const lines: string[] = [
    `package main`,
    ``,
    `import (`,
    `    "fmt"`,
    `    "io"`,
    `    "net/http"`,
  ];

  if (hasBody(req)) {
    lines.push(`    "strings"`);
  }

  lines.push(`)`);
  lines.push(``);
  lines.push(`func main() {`);
  lines.push(`    client := &http.Client{}`);

  if (hasBody(req)) {
    lines.push(`    req, err := http.NewRequest(${q(req.method)}, ${q(req.url)}, strings.NewReader(${q(req.body)}))`);
  } else {
    lines.push(`    req, err := http.NewRequest(${q(req.method)}, ${q(req.url)}, nil)`);
  }

  lines.push(`    if err != nil {`);
  lines.push(`        panic(err)`);
  lines.push(`    }`);
  lines.push(``);

  for (const [key, value] of Object.entries(req.headers)) {
    lines.push(`    req.Header.Set(${q(key)}, ${q(value)})`);
  }

  lines.push(``);
  lines.push(`    resp, err := client.Do(req)`);
  lines.push(`    if err != nil {`);
  lines.push(`        panic(err)`);
  lines.push(`    }`);
  lines.push(`    defer resp.Body.Close()`);
  lines.push(``);
  lines.push(`    body, _ := io.ReadAll(resp.Body)`);
  lines.push(`    fmt.Println(string(body))`);
  lines.push(`}`);

  return lines.join("\n");
};

const generateRust = (req: ParsedRequest): string => {
  const lines: string[] = [
    `use reqwest;`,
    `use std::collections::HashMap;`,
    ``,
    `#[tokio::main]`,
    `async fn main() -> Result<(), Box<dyn std::error::Error>> {`,
    `    let client = reqwest::Client::new();`,
    ``,
    `    let mut request = client.request(reqwest::Method::${req.method}, ${q(req.url)});`,
  ];

  for (const [key, value] of Object.entries(req.headers)) {
    lines.push(`    request = request.header(${q(key)}, ${q(value)});`);
  }

  if (hasBody(req)) {
    lines.push(`    request = request.body(${q(req.body)});`);
  }

  lines.push(``);
  lines.push(`    let response = request.send().await?;`);
  lines.push(`    println!("{}", response.text().await?);`);
  lines.push(``);
  lines.push(`    Ok(())`);
  lines.push(`}`);

  return lines.join("\n");
};

const generatePhp = (req: ParsedRequest): string => {
  const lines: string[] = [
    `<?php`,
    ``,
    `require 'vendor/autoload.php';`,
    ``,
    `use GuzzleHttp\\Client;`,
    `use GuzzleHttp\\Psr7\\Request;`,
    ``,
    `$client = new Client();`,
    ``,
    `$headers = ${js(req.headers)};`,
  ];

  if (hasBody(req)) {
    lines.push(`$body = ${q(req.body)};`);
    lines.push(``);
    lines.push(`$request = new Request(${q(req.method)}, ${q(req.url)}, $headers, $body);`);
  } else {
    lines.push(``);
    lines.push(`$request = new Request(${q(req.method)}, $url, $headers);`);
  }

  lines.push(`$response = $client->send($request);`);
  lines.push(`echo $response->getBody();`);

  return lines.join("\n");
};

const generateRuby = (req: ParsedRequest): string => {
  const lines: string[] = [
    `require 'httparty'`,
    ``,
    `response = HTTParty.${req.method.toLowerCase()}(${q(req.url)},`,
    `  headers: ${js(req.headers)},`,
  ];

  if (hasBody(req)) {
    const isJson = req.headers["Content-Type"]?.includes("json");
    if (isJson) {
      lines.push(`  body: ${req.body}.to_json`);
    } else {
      lines.push(`  body: ${q(req.body)}`);
    }
  }

  lines.push(`)`);
  lines.push(``);
  lines.push(`puts response.code`);
  lines.push(`puts response.body`);

  return lines.join("\n");
};

const generateCSharp = (req: ParsedRequest): string => {
  const lines: string[] = [
    `using System;`,
    `using System.Net.Http;`,
    `using System.Text;`,
    `using System.Threading.Tasks;`,
    ``,
    `class Program`,
    `{`,
    `    static async Task Main()`,
    `    {`,
    `        using var client = new HttpClient();`,
    ``,
  ];

  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() === "content-type") continue;
    lines.push(`        client.DefaultRequestHeaders.Add(${q(key)}, ${q(value)});`);
  }

  lines.push(``);

  if (hasBody(req)) {
    lines.push(`        var content = new StringContent(${q(req.body)}, Encoding.UTF8, "application/json");`);
    lines.push(`        var response = await client.${req.method === "GET" ? "GetAsync" : `${req.method}Async`}(${req.method === "GET" ? q(req.url) : `${q(req.url)}, content`});`);
  } else {
    lines.push(`        var response = await client.GetAsync(${q(req.url)});`);
  }

  lines.push(``);
  lines.push(`        var result = await response.Content.ReadAsStringAsync();`);
  lines.push(`        Console.WriteLine(result);`);
  lines.push(`    }`);
  lines.push(`}`);

  return lines.join("\n");
};

const generateKotlin = (req: ParsedRequest): string => {
  const lines: string[] = [
    `import okhttp3.*`,
    `import okhttp3.MediaType.Companion.toMediaType`,
    `import okhttp3.RequestBody.Companion.toRequestBody`,
    ``,
    `fun main() {`,
    `    val client = OkHttpClient()`,
    ``,
  ];

  if (hasBody(req)) {
    const contentType = req.headers["Content-Type"] || "application/json";
    lines.push(`    val body = ${q(req.body)}.toRequestBody("${contentType}".toMediaType())`);
    lines.push(``);
    lines.push(`    val request = Request.Builder()`);
    lines.push(`        .url(${q(req.url)})`);
    lines.push(`        .method(${q(req.method)}, body)`);
  } else {
    lines.push(`    val request = Request.Builder()`);
    lines.push(`        .url(${q(req.url)})`);
    lines.push(`        .method(${q(req.method)}, null)`);
  }

  for (const [key, value] of Object.entries(req.headers)) {
    lines.push(`        .addHeader(${q(key)}, ${q(value)})`);
  }

  lines.push(`        .build()`);
  lines.push(``);
  lines.push(`    val response = client.newCall(request).execute()`);
  lines.push(`    println(response.body?.string())`);
  lines.push(`}`);

  return lines.join("\n");
};

const generateSwift = (req: ParsedRequest): string => {
  const lines: string[] = [
    `import Foundation`,
    ``,
    `let url = URL(string: ${q(req.url)})!`,
    `var request = URLRequest(url: url)`,
    `request.httpMethod = ${q(req.method)}`,
    ``,
  ];

  for (const [key, value] of Object.entries(req.headers)) {
    lines.push(`request.setValue(${q(value)}, forHTTPHeaderField: ${q(key)})`);
  }

  if (hasBody(req)) {
    lines.push(``);
    lines.push(`request.httpBody = ${q(req.body)}.data(using: .utf8)`);
  }

  lines.push(``);
  lines.push(`let task = URLSession.shared.dataTask(with: request) { data, response, error in`);
  lines.push(`    if let data = data, let json = String(data: data, encoding: .utf8) {`);
  lines.push(`        print(json)`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`task.resume()`);

  return lines.join("\n");
};

const generateDart = (req: ParsedRequest): string => {
  const lines: string[] = [
    `import 'package:http/http.dart' as http;`,
    ``,
    `void main() async {`,
    `  var headers = ${js(req.headers)};`,
    ``,
  ];

  if (hasBody(req)) {
    lines.push(`  var response = await http.${req.method.toLowerCase()}(`);
    lines.push(`    Uri.parse(${q(req.url)}),`);
    lines.push(`    headers: headers,`);
    lines.push(`    body: ${q(req.body)},`);
    lines.push(`  );`);
  } else {
    lines.push(`  var response = await http.${req.method.toLowerCase()}(`);
    lines.push(`    Uri.parse(${q(req.url)}),`);
    lines.push(`    headers: headers,`);
    lines.push(`  );`);
  }

  lines.push(``);
  lines.push(`  print(response.statusCode);`);
  lines.push(`  print(response.body);`);
  lines.push(`}`);

  return lines.join("\n");
};

const OUTPUT_OPTIONS: OutputOption[] = [
  { id: "javascript-fetch", label: "JavaScript", library: "fetch", icon: "JS", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400", generate: generateJavaScriptFetch },
  { id: "javascript-axios", label: "JavaScript", library: "axios", icon: "AX", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400", generate: (req) => generateAxios(req, false) },
  { id: "node-fetch", label: "Node.js", library: "fetch", icon: "NF", color: "bg-green-500/10 text-green-600 dark:text-green-400", generate: generateNodeFetch },
  { id: "node-axios", label: "Node.js", library: "axios", icon: "NA", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400", generate: (req) => generateAxios(req, true) },
  { id: "python", label: "Python", library: "requests", icon: "PY", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", generate: generatePython },
  { id: "java", label: "Java", library: "HttpClient", icon: "JV", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", generate: generateJava },
  { id: "go", label: "Go", library: "net/http", icon: "GO", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400", generate: generateGo },
  { id: "rust", label: "Rust", library: "reqwest", icon: "RS", color: "bg-red-500/10 text-red-600 dark:text-red-400", generate: generateRust },
  { id: "php", label: "PHP", library: "Guzzle", icon: "PH", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400", generate: generatePhp },
  { id: "ruby", label: "Ruby", library: "HTTParty", icon: "RB", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400", generate: generateRuby },
  { id: "csharp", label: "C#", library: "HttpClient", icon: "CS", color: "bg-green-500/10 text-green-600 dark:text-green-400", generate: generateCSharp },
  { id: "kotlin", label: "Kotlin", library: "OkHttp", icon: "KT", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", generate: generateKotlin },
  { id: "swift", label: "Swift", library: "URLSession", icon: "SW", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", generate: generateSwift },
  { id: "dart", label: "Dart", library: "http", icon: "DT", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400", generate: generateDart },
];

export function CurlConverter() {
  const [inputFormat, setInputFormat] = useState<InputFormat>("curl-bash");
  const [input, setInput] = useState(INPUT_FORMATS[0].example);
  const [selectedTarget, setSelectedTarget] = useState<OutputTarget>("javascript-fetch");
  const [copied, setCopied] = useState(false);

  const parsedRequest = useMemo(() => parseInput(input, inputFormat), [input, inputFormat]);

  const output = useMemo(() => {
    const option = OUTPUT_OPTIONS.find((o) => o.id === selectedTarget);
    if (!option) return "";
    try {
      return option.generate(parsedRequest);
    } catch (e) {
      return `// 转换错误: ${(e as Error).message}`;
    }
  }, [parsedRequest, selectedTarget]);

  const selectedOption = OUTPUT_OPTIONS.find((o) => o.id === selectedTarget);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormatChange = (format: InputFormat) => {
    setInputFormat(format);
    const example = INPUT_FORMATS.find((f) => f.id === format);
    if (example) setInput(example.example);
  };

  const lineCount = output.split("\n").length;

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <Card className="overflow-hidden border-2 py-0">
        <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Code2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">HTTP 请求代码转换</h2>
              <p className="text-sm text-muted-foreground">
                粘贴 cURL、PowerShell、fetch 等格式，一键转换为 14 种编程语言代码
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr,1.2fr]">
        {/* Input */}
        <Card className="overflow-hidden border-2 py-0">
          <div className="border-b bg-muted/30 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">输入</h3>
              <div className="flex flex-wrap gap-1.5">
                {INPUT_FORMATS.map((format) => (
                  <Button
                    key={format.id}
                    size="sm"
                    variant={inputFormat === format.id ? "default" : "ghost"}
                    className="h-7 px-2.5 text-xs"
                    onClick={() => handleFormatChange(format.id)}
                  >
                    {format.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="粘贴 HTTP 请求代码..."
            className="h-[520px] w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
            spellCheck={false}
          />
          {/* Parsed Info */}
          <div className="grid grid-cols-3 gap-3 border-t bg-muted/20 px-4 py-3 text-xs">
            <div>
              <span className="text-muted-foreground">Method</span>
              <p className="mt-0.5 font-mono font-semibold text-primary">{parsedRequest.method}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">URL</span>
              <p className="mt-0.5 truncate font-mono">{parsedRequest.url || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Headers</span>
              <p className="mt-0.5 font-mono">{Object.keys(parsedRequest.headers).length} 个</p>
            </div>
            <div>
              <span className="text-muted-foreground">Body</span>
              <p className="mt-0.5 font-mono">{parsedRequest.body ? `${parsedRequest.body.length} 字符` : "无"}</p>
            </div>
          </div>
        </Card>

        {/* Output */}
        <Card className="overflow-hidden border-2 py-0">
          <div className="border-b bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">输出</h3>
                {selectedOption && (
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${selectedOption.color}`}>
                    {selectedOption.library}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{lineCount} 行</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 px-2.5 text-xs"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      复制代码
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Language Selector */}
          <div className="border-b bg-muted/10 px-4 py-2.5">
            <div className="flex flex-wrap gap-1.5">
              {OUTPUT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedTarget(option.id)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                    selectedTarget === option.id
                      ? "bg-primary text-primary-foreground shadow-sm scale-105"
                      : "bg-background hover:bg-muted hover:scale-102"
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                      selectedTarget === option.id
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : option.color
                    }`}
                  >
                    {option.icon}
                  </span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Code Output */}
          <textarea
            value={output}
            readOnly
            className="h-[520px] w-full resize-none bg-muted/5 p-4 font-mono text-sm leading-relaxed outline-none"
            spellCheck={false}
          />
        </Card>
      </div>

      {/* Quick Tips */}
      <Card className="border-2 py-0">
        <div className="flex flex-wrap items-center gap-6 px-6 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-yellow-500" />
            <span>从浏览器开发者工具 Network 面板右键复制请求</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowRight className="h-3.5 w-3.5" />
            <span>支持 cURL、PowerShell、fetch 等格式输入</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Code2 className="h-3.5 w-3.5" />
            <span>输出 14 种编程语言代码</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
