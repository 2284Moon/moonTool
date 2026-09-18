# AGENT.md — moonTool 开发指南

面向在本仓库写代码的人（和 AI）。讲技术选型、目录约定、怎么加东西、以及那些踩过的坑。

用户视角的功能介绍见 [README.md](./README.md)。

---

## 一、项目定位

纯前端工具站 + 网站导航，部署在 Vercel。

**没有数据库、没有登录、没有 CMS。** 工具和精选站点全部编译期静态定义；唯一的动态数据是用户自建的网站条目，存在 Vercel Edge Config 里。

---

## 二、技术栈

| 类别 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | Next.js 16（App Router） | 页面路由 + SSG 预渲染 |
| 语言 | TypeScript | `strict: true`，目标 ES2022 |
| UI | React 19 | 全部函数组件 |
| 样式 | Tailwind CSS v4 | CSS-first 配置，无 `tailwind.config.js` |
| 组件库 | shadcn/ui（style: `base-nova`，底层 `@base-ui/react`） | 配置文件 `components.json` |
| 图标 | lucide-react | 统一图标源，不混用其他图标库 |
| 状态 | Zustand | 仅一个搜索词 store |
| 动画 | Framer Motion + Tailwind 内置 | 见「动画」一节的分工原则 |
| 包管理 | pnpm | 有 `pnpm-workspace.yaml` |
| 部署 | Vercel | 零配置 |

### 实测构建基线

改动后拿这组数字对比，明显劣化说明引入了问题：

- 编译 ~37s，TypeScript 检查 ~13s
- **38 个静态页**：4 个页面路由（`/`、`/tools`、`/sites`、`/tools/[toolId]` 外壳）+ 28 个工具页 + robots + sitemap 等
- **28 个工具页全部预渲染为 HTML**（`.next/server/app/tools/<id>.html`），必须与 `data/tools.ts` 条目数一一对齐

校验命令：

```bash
ls .next/server/app/tools/*.html | wc -l          # 应为 28
grep -cE '^    id: "' src/data/tools.ts          # 应为 28
```

两者不一致 = 有工具漏了注册或 `generateStaticParams` 出问题。

### 按需引用的运行时依赖

只有用到时才 `import`，且尽量留在工具的独立 chunk 里：

| 依赖 | 使用位置 |
| --- | --- |
| `crypto-js` | 加密解密、哈希计算、JWT 解析 |
| `sql-formatter` | SQL 格式化 |
| `yaml` | 数据格式转换、`/api/convert` |
| `diff` | 文本差异对比 |
| `fflate` | 文件打包解压（ZIP 读写） |
| `qrcode` / `jsbarcode` | 二维码、条形码 |
| `dayjs` | 时间戳转换 |
| `upscaler`（TensorFlow.js） | 图片处理的 AI 增强，**必须动态 import** |
| `axios` | 未在 `src/` 中 import。`curl-converter` 里的「Axios」只是生成的代码字符串 |

**两处历史遗留**（`package.json` 里有但代码中零引用）：

- `@tensorflow/tfjs` —— `upscaler` 自己会带，不需要显式安装
- `curlconverter` —— 曾是 cURL 转换的实现，现在解析逻辑是手写的

清理这两项前先确认没有未提交的分支在用。

---

## 三、目录结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局：Header + main + Footer + BackToTop
│   ├── page.tsx                # /            首页
│   ├── globals.css             # Tailwind 入口 + 主题变量 + 自定义动画
│   ├── robots.ts               # /robots.txt
│   ├── sitemap.ts              # /sitemap.xml（静态路由 + 全部工具页）
│   ├── tools/
│   │   ├── page.tsx            # /tools
│   │   └── [toolId]/page.tsx   # /tools/[toolId]  ★ 新增工具要改这里
│   ├── sites/page.tsx          # /sites
│   └── api/
│       ├── sites/route.ts          # GET / POST / DELETE  用户自建站点
│       ├── convert/route.ts        # GET / POST           订阅转换
│       └── api-health-check/route.ts  # POST              LLM API 探测
├── components/
│   ├── ui/                     # shadcn/ui 生成的基础组件，别手改
│   └── *.tsx                   # 业务组件
├── data/
│   ├── tools.ts                # 工具清单（唯一数据源）
│   └── sites.ts                # 精选站点（唯一数据源）
├── lib/utils.ts                # cn() —— clsx + tailwind-merge
├── store/useSearchStore.ts     # 搜索词
├── tools/<tool-id>/index.tsx   # 每个工具一个目录，单文件实现
├── types/index.ts              # Tool / Site 类型
└── util/
    ├── favicon.ts              # favicon 候选链
    └── search.ts               # fuzzyMatch()
```

**没有 `src/hooks/`。** 逻辑都留在组件内部，需要复用就抽到 `src/util/`。

---

## 四、路由与页面

| 路由 | 文件 | 渲染方式 |
| --- | --- | --- |
| `/` | `app/page.tsx` | SSG |
| `/tools` | `app/tools/page.tsx` | SSG |
| `/tools/[toolId]` | `app/tools/[toolId]/page.tsx` | SSG，`generateStaticParams` 预生成 |
| `/sites` | `app/sites/page.tsx` | SSG 外壳 + 客户端拉取用户站点 |
| `/api/*` | `app/api/**/route.ts` | Route Handler |

### 为什么 `/sites` 不是纯静态

精选站点在 `data/sites.ts` 里编译期就绪，但用户自建的站点存在 Edge Config，只能在运行时读。所以 `SiteGrid` 是客户端组件，挂载后 `fetch("/api/sites")` 拿合并结果。首屏会有一个短暂的「加载中...」。

### `generateStaticParams` 在 dev 下返回空数组

```ts
export function generateStaticParams() {
  if (process.env.NODE_ENV === "development") return [];
  return tools.map((tool) => ({ toolId: tool.id }));
}
```

**不要删掉这个 `if`。** 开发模式下预生成全部工具页会让 Turbopack 把 28 个工具的 chunk 全部编译一遍，改一个工具要等整个列表重建；返回空数组则按需编译，只编译你访问的那个。

---

## 五、数据模型

```ts
// src/types/index.ts

interface Tool {
  id: string;           // 唯一标识，也是路由段和工具目录名
  name: string;         // 显示名称
  description: string;  // 卡片描述，同时参与搜索
  icon: string;         // emoji
  tags: string[];       // 分类标签，参与搜索
  component: string;    // 工具目录名
}

interface Site {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;         // favicon 全部加载失败时的兜底 emoji
  tags: string[];
  userAdded?: boolean;  // true = 用户自建，可删；缺省 = 精选站点，不可删
}
```

`Tool.component` 目前**没有实际消费者**——`[toolId]/page.tsx` 用的是 `switch (toolId)` 硬编码映射。保留它是为了将来能改成自动映射，加工具时跟着填上即可，值与 `id` 一致。

---

## 六、怎么加一个工具 ★

改 **3 个地方**，漏一个就静默落到「工具功能开发中...」的兜底文案。

### 1. 在 `src/data/tools.ts` 追加一条

```ts
{
  id: "my-tool",                    // kebab-case，同时是目录名
  name: "我的工具",
  description: "一句话说清这个工具做什么",
  icon: "🛠️",
  tags: ["开发", "转换"],            // 复用已有标签，方便搜索
  component: "my-tool",             // 与 id 保持一致
},
```

### 2. 创建 `src/tools/my-tool/index.tsx`

```tsx
"use client";                      // 工具几乎都是有交互的，必须加

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy } from "lucide-react";

export function MyTool() {
  // ...
}
```

约定：

- 导出**命名函数组件**（`export function MyTool`），不用 default export
- 组件名 PascalCase，导出名要和 `[toolId]/page.tsx` 里的引用一致
- 只引用 `@/components/ui/*`、`@/lib/utils`、`@/util/*`，以及第三方库
- **不跨工具引用**：不要 `import` 另一个工具目录里的东西。要共用就抽到 `src/util/`
- 交互控件的 `input` / `button` 记得加 `cursor-pointer`（Tailwind v4 起默认不再是 pointer）

### 3. 在 `src/app/tools/[toolId]/page.tsx` 注册 —— 两处

顶部加动态导入：

```ts
const MyTool = dynamic(() => import("@/tools/my-tool").then((m) => m.MyTool));
```

`renderToolComponent()` 的 switch 里加分支：

```ts
case "my-tool":
  return <MyTool />;
```

漏掉这两处的后果是：页面正常打开，但显示「工具功能开发中...」——没有报错，容易漏。

**导出的名字不是组件同名时**（如 `base64-encoder` 的导出是 `EncodingTools`），`.then((m) => m.XxxXxx)` 里写真实导出名。

### 4. 需要 SSR 关闭时用 wrapper

`system-info` 因为读取 `navigator` / `window`，用了二层包装：

```tsx
// src/tools/system-info/wrapper.tsx
"use client";
import dynamic from "next/dynamic";

const SystemInfoInner = dynamic(() => import("./index").then((m) => m.SystemInfo), { ssr: false });

export function SystemInfoWrapper() {
  return <SystemInfoInner />;
}
```

然后在 page 里导入 wrapper。`tools.ts` 的 `component` 字段仍填目录名 `system-info`。

---

## 七、怎么加一个精选网站

只改 `src/data/sites.ts` 一处：

```ts
{
  id: "example",
  name: "Example",
  description: "一句话描述",
  url: "https://example.com",      // 必须带协议
  icon: "🌐",                      // favicon 失败时的兜底
  tags: ["工具", "效率"],
},
```

不需要建组件、不需要改路由。列表和搜索会自动包含它。

注意：精选站点的 `id` 会进入 `defaultIds` 集合并**禁止删除**（`/api/sites` 的 DELETE 会返回 403）。

---

## 八、API 路由

### `/api/sites`

| 方法 | 作用 | 关键逻辑 |
| --- | --- | --- |
| GET | 返回精选 + 用户站点合并列表 | 按归一化 URL 去重，精选在前 |
| POST | 新增用户站点 | 同 IP 60 秒冷却；与精选站点重复返回 409 |
| DELETE | 删除用户站点 | 需 `x-delete-key` 请求头匹配 `DELETE_SECRET`；精选站点 403 |

**存储模型**：Edge Config 的 `user_sites` 键，**只存用户自建站点**。精选站点永远来自 `data/sites.ts`。

这个设计是刻意的——消除「固定数据与用户数据混在一起」导致的一系列补丁（seed、auto-merge、脏数据清洗）。改动时请保持这条边界。

**读写路径**：`readUserSites()` 优先走 Vercel REST API（`cache: "no-store"`，拿实时数据），失败才回退 Edge Config SDK（走 CDN 有延迟）。写入统一用 REST API 的 PATCH `upsert`。

**兼容性处理**：`parseUserSites()` 要同时吃下三种形态——已解析的数组、JSON 字符串、以及元素本身是 JSON 字符串的数组。这是 Edge Config 多层序列化的历史问题，删掉任何一层兼容都会让旧数据读不出来。同理 `normalizeSite()` 给缺失字段兜默认值。

**前端配合**：`SiteGrid` 新增/删除后直接改本地 state，**不重新拉数据**——Edge Config 写后读有延迟，重新拉会看到旧列表。这个约定别动。

### `/api/convert`

`runtime = "edge"`。把代理订阅转成 Clash YAML 或 Shadowrocket/v2rayN 的 Base64 URI 列表。

- 输入三种方式：URL 抓取、粘贴文本、上传文件
- 自动处理多层 Base64 嵌套（最多 3 层）
- 若解码结果本身又是一个 URL，会递归抓取（最多 2 层），带 10 秒超时
- 支持 URI 协议：`vmess` `vless` `trojan` `ss` `ssr`
- 支持 Clash YAML 输入（直接抽 `proxies` 数组再重组）
- 输出附 `X-Nodes-Count` 和 `X-Protocols` 响应头
- 抓取失败按原因分类返回提示（超时/DNS/TLS/拒绝/拦截），错误码 502/504，解析失败 422

**注意**：这个路由会让服务端去请求**用户提供的任意 URL**。新增能力前想清楚 SSRF 面——目前限制是只允许 http(s)、超时 10s、递归深度 2。别放开成任意协议。

**改 `toClashConfig()` 时务必保持组名一致**：组名已提成常量（`GROUP_SELECT` / `GROUP_AUTO` / `GROUP_DIRECT` / `GROUP_BLOCK` / `GROUP_FINAL`），`proxy-groups` 的定义和 `rules` 的引用都走常量。

这里踩过坑：曾在 `proxy-groups` 里定义 `🌏 直连通道`，但 `rules` 里引用的是 `🎯 全球直连`——一个根本不存在的组。Clash 校验不通过会**拒绝加载整个配置文件**，所以只要目标选 Clash，输出就是废的，且没有任何报错提示。加组或改组名时两处必须同步，用常量就是为了杜绝这类不一致。

**输出格式的往返完整性**：`toShadowrocket()` 按协议分支拼 URI，每种传输方式（`ws` / `grpc` / `h2`）都要把对应 `*-opts` 里的字段写回 query 参数。曾经漏了 grpc 的 `serviceName`，导致 grpc 节点转出来连不上。

### `/api/api-health-check`

服务端代发 LLM 探测请求，绕开浏览器跨域。支持 `openai` / `anthropic` / `gemini` 三种请求体格式和四种鉴权头。

**安全约定**：HTTP 非 2xx 和网络异常都返回 `200`，把失败信息放进 body 的 `ok: false`——前端只关心「探测到了什么」，不该被 HTTP 状态码打断。真正的入参错误（缺 url / 缺 model）才返回 400。

`extractText()` 对各家响应格式做了兜底解析，新增厂商时在这里加分支。

---

## 九、样式与主题

主题变量在 `src/app/globals.css`，用的是 **oklch** 色彩空间：

- `:root` —— 亮色，`--background: oklch(1 0 0)` 纯白起底
- `.dark` —— 暗色，`--background: oklch(0.145 0 0)`

语义色板全套都在（`background` / `foreground` / `card` / `muted` / `primary` / `destructive` / `border` / `ring` / `chart-1..5` / `sidebar-*`）。

**规则**：

- 只用语义类（`bg-card`、`text-muted-foreground`、`border-border`），**不写死颜色**。写死颜色在暗色主题下必然出问题
- 需要新颜色时先在 `globals.css` 加变量，再通过 `@theme inline` 暴露成 `--color-xxx`
- `#` 号和 `red-500` 这类绝对色值仅用于个别装饰（如删除按钮的 hover 态），且要同时给 `.dark` 变体

### 字体

Geist（`--font-sans`）和 Geist Mono（`--font-geist-mono`），通过 `next/font/local` 从 `src/app/fonts/*.woff2` 加载，变量挂在 `<html>` 上。不引 Google Fonts CDN。

### 自定义动画

`globals.css` 里定义的：

- `fadeInUp` / `float` —— keyframes，供 Tailwind `animate-*` 用
- `expand-circle` —— 配合 View Transition API 实现主题切换的圆形扩散
- `::view-transition-*` —— 主题过渡时序
- `.bg-checkerboard` —— 图片预览的透明通道棋盘格（含 `.dark` 变体）
- 极窄滚动条（4px，亮暗各一套）

### 动画分工

- **Tailwind transition** —— hover、颜色、位移这类简单状态变化
- **Framer Motion** —— 入场动画、列表 stagger、手势、`whileHover` 弹性效果

别混着用同一个元素：已经有 `motion.div` 做入场，就别再叠 `animate-*` 类。

---

## 十、状态与搜索

```ts
// src/store/useSearchStore.ts
export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  setQuery: (query) => set({ query }),
}));
```

极简。别往这里加无关状态。

搜索链路：

1. `SearchInput` 受控 `onChange` → 200ms 防抖 → `setQuery()`
2. `ToolGrid` / `SiteGrid` 订阅 `query`，`useMemo` 过滤

**已知不一致**：`SearchInput` 是非受控的（没有 `value` prop），但 `AddSiteDialog` 等组件可能通过 store 改 `query`。目前没有这种调用，但如果将来要「点标签直接搜」，得先把 `SearchInput` 改成受控并去掉防抖，否则输入框会显示不出外部设的值。

`fuzzyMatch()` 名字有误导——它实际上是**不区分大小写的子串匹配**（`toLowerCase().includes()`），不是模糊匹配。要真做模糊搜索（拼音首字母、错字容忍）得换实现，并同步更新这个函数名。

搜索范围：`name`、`description`、`tags` 三个字段。

---

## 十一、SEO

已经做的：

- `layout.tsx` 里全局 Metadata（含 `metadataBase`、OpenGraph、Twitter Card）
- 每个页面各自 `export const metadata` / `generateMetadata`
- `JsonLd` 组件注入结构化数据：首页 `WebSite`、列表页 `BreadcrumbList`、工具页额外注入 `SoftwareApplication`
- `sitemap.ts` 自动包含所有工具页
- `robots.ts` 禁掉 `/api/` 和 `/_next/`
- 所有页面 `lang="zh-CN"`

新增页面时**必须**补上 `metadata`（`title` / `description` / `alternates.canonical`），并考虑是否要 `JsonLd`。

生产环境务必配 `NEXT_PUBLIC_BASE_URL`——canonical、sitemap、结构化数据全部依赖它，缺了会回落到 `http://localhost:3000`。

---

## 十二、环境变量

| 变量 | 用途 | 必需 |
| --- | --- | --- |
| `NEXT_PUBLIC_BASE_URL` | canonical / sitemap / JsonLd 的绝对地址 | 生产必需 |
| `VERCEL_TOKEN` | 读写 Edge Config 的 API Token | 自建站点功能必需 |
| `EDGE_CONFIG` | Edge Config 连接串，Vercel 自动注入 | 二选一 |
| `EDGE_CONFIG_ID` | Edge Config ID，可从 `EDGE_CONFIG` 解析 | 二选一 |
| `DELETE_SECRET` | 删除自建站点时的密钥 | 删除功能必需 |

本地只有 `DELETE_SECRET` 被写入 `.env`。**因此本地跑 `/api/sites` 的写操作必然失败**，返回「存储服务未配置」——这是预期行为，站点增删只能在线上验证。

---

## 十三、开发与构建

```bash
pnpm install
pnpm dev          # Turbopack，默认 3000
pnpm build
pnpm start
pnpm lint
```

### 提交前必做

```bash
pnpm lint
pnpm build
```

`pnpm build` 不能省。工具页是 SSG 的，构建期会真正执行一遍；类型错误、`window` 在模块顶层被引用之类的问题只有 build 才暴露。历史上已经有两次因为类型导入问题导致 Vercel 构建失败。

> **注意当前 lint 状态是红的**（94 个问题：73 errors / 21 warnings，其中 78 个在 `src/tools/system-info/index.tsx`）。构建能过，所以不是阻塞项，但改动前先心里有数，别把新增报错混进这一堆里。想清理的话优先处理 `system-info` 一个文件就能消掉大部分。

---

## 十四、已知隐患

按严重程度排，改之前先看这里。

### 1. 速率限制在 serverless 上不可靠

`app/api/sites/route.ts` 的 `addTimestamps` 是模块级 `Map`。Vercel 的 serverless 实例随时销毁重建，且请求会分散到多个实例，每个实例有自己的 Map。结果是「每 IP 每分钟一次」只在单实例命中时生效，并发刷站拦不住。

要真正生效得换成共享存储（Edge Config、Upstash Redis 等）。当前的实现只能算「防手滑重复点击」。

### 2. id 生成可被绕过，产生重复条目

POST 里的 id 由 URL 归一化生成：`custom-` + 去掉协议、非字母数字转连字符。但：

- 去重检查用 `s.id !== id` 精确匹配，而 id 依赖 URL 的写法
- `normalizeUrl()` 只做了 `toLowerCase()` 和去尾部斜杠，没处理 `www.` 前缀、默认端口、`?query`、`#hash`

用户加 `https://a.com` 和 `https://www.a.com?x=1` 会得到两条不同 id 的记录。GET 里有按归一化 URL 去重兜底，所以不会重复显示，但 Edge Config 里会积累脏数据。

修法：把归一化做彻底（去 `www.`、去默认端口、去 query 和 hash），去重用归一化后的 URL 而不是 id。

### 3. 删除的 404 判断不严谨

```ts
const filtered = userSites.filter((s) => s.id !== id);
if (filtered.length === userSites.length) { /* 404 */ }
```

靠长度差判断「是否存在」。如果 id 重复的脏数据存在，删掉 2 条时长度差为 2，会走到成功分支——功能上正好能过，但这个判断方式本身不表达意图。改成先 `some()` 判断存在性再过滤更清楚。

### 4. 加工具要改 3 个地方

`tools.ts` + `tools/<id>/index.tsx` + `[toolId]/page.tsx` 里的动态导入和 switch。第三处遗漏**不会报错**，只会静默显示「工具功能开发中...」。

想收敛的话有两个方向：

- **自动映射**：`const mod = await import(\`@/tools/${toolId}\`)`，配合 `Tool.exportName` 字段。Turbopack 对完全动态的 import 支持有限，需要实测是否能正确分包
- **集中注册表**：新建 `src/tools/registry.ts` 导出 `Record<string, () => Promise<{ default: ComponentType }>>`，page 只 import 这一个文件。至少把「改 2 处」降到「改 1 处」

### 5. 大文件处理会阻塞主线程

`image-tool`（Canvas）、`file-archiver`（fflate）、`hash-calculator`（切片）全在主线程跑，没有 Web Worker。大文件会直接卡死 UI，增强图片时还会同时加载 TensorFlow.js 模型，峰值内存很可观。

规模再大就得挪进 Worker。当前的切片策略能缓解哈希计算，但压缩和重采样没法靠切片解决。

### 6. `/api/convert` 是开放的抓取代理

任何人可以用它让服务端去请求任意外部地址。已有防护：仅 http(s)、10 秒超时、递归深度 2。但这仍是一个对外的资源消耗点——如果被滥用，Vercel 的带宽和滥用报告会找上门。

考虑加 IP 频率限制或要求 Referer 校验。别放开协议限制。

**另外**：`diagnoseContent()` 会识别 `hysteria://` 和 `tuic://` 并写进错误提示，但 `parseUri()` 并不支持这两种协议。用户看到「检测到协议: [hysteria]」会以为内容没问题，实际是解析器不支持。要么补解析，要么把这两个从识别列表里去掉，避免误导。

**缓存**：`Cache-Control` 是 `private, max-age=60`，但订阅链接（GET）每次请求都要重新抓源站。客户端按间隔轮询订阅时，会产生大量重复的外部请求。想减轻的话可以给源站抓取加一层短 TTL 缓存。

### 7. Vercel Hobby 带宽

Hobby 方案每月 100 GB 带宽，超了会返回 429/402 并暂停服务。纯静态页面很难跑满，但要留意 `image-tool` 的 AI 增强——`upscaler` 会加载 TensorFlow.js 模型文件（数 MB），如果被频繁访问会持续消耗额度。模型应尽量让浏览器长时间缓存。

### 8. 工具组件普遍是 500+ 行单文件

28 个工具，总计约 2.6 万行，最大的 `api-health-checker` 有 1112 行。UI 和业务逻辑混在一个文件里，改一处要滚动很久。

现在还能忍，但到 40+ 工具会开始难受。要拆的话建议按「纯逻辑抽 `src/util/<tool>/`，组件只留渲染」的边界切，别按 UI 区块切——UI 区块之间的状态耦合更紧，拆了反而更难读。

### 9. `pnpm lint` 当前未通过

94 个问题（73 errors / 21 warnings）。分布：

| 文件 | 问题数 |
| --- | --- |
| `src/tools/system-info/index.tsx` | 78 |
| `src/tools/regex-tester/index.tsx` | 5 |
| `src/tools/code-generator/index.tsx` | 4 |
| 其余 15 个文件 | 各 1–3 |

`system-info` 一个文件占了 83%，且它同时是唯一用 `dynamic(..., { ssr: false })` 二次包装的工具——两个问题大概率同源（大量 `setState` 直接写在 effect 体内，触发 `react-hooks/set-state-in-effect`）。修它一个就能把 lint 拉回接近干净。

`pnpm build` 能过，所以不影响部署，但 CI 里加 lint 关卡之前得先清掉。

---

## 十五、代码规范

### 命名

| 类型 | 规则 | 示例 |
| --- | --- | --- |
| 路由目录 / 工具目录 | kebab-case | `json-formatter` |
| 组件文件 | PascalCase | `ToolCard.tsx` |
| 工具函数 | camelCase | `favicon.ts` |
| React 组件 | PascalCase | `export function SiteCard` |

### 导入顺序

```ts
// 1. React / Next.js
import { useState } from "react";
import Link from "next/link";

// 2. 第三方
import { motion } from "framer-motion";
import { Copy } from "lucide-react";

// 3. 项目内部（@/ 别名）
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 4. 类型
import type { Tool } from "@/types";
```

用 `@/` 别名，不用相对路径跨目录跳（同目录内 `./Xxx` 可以）。类型导入用 `import type`。

### 组件

- 函数组件 + TypeScript，Props 用 `interface` 定义
- 优先用 `components/ui/` 里的 shadcn 组件，不自己造
- 客户端组件必须显式 `"use client"`，放在文件第一行
- 类名合并用 `cn()`（`@/lib/utils`），不要手写模板字符串拼接

### 注释

- 讲**为什么**，不讲**是什么**。`// 遍历数组` 是噪音，`// 图源被墙时请求会挂起不触发 onError，所以加超时降级` 才有价值
- 涉及历史坑的代码，把坑写清楚。`parseUserSites` 和 `favicon.ts` 是好的示范

### 不要做的事

- 手改 `src/components/ui/` 下的文件——那是 shadcn 生成的，重新生成会覆盖
- 为小改动堆文档和测试（用户明确要求过）
- 跨工具目录互相 import
- 在 `useSearchStore` 里加与搜索无关的状态
