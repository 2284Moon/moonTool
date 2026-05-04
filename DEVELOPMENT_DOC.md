# moonTool — 开发文档

## 一、项目概述

moonTool 是一个纯前端工具集合网站，包含各类在线小工具和精选网站导航。所有内容均由代码驱动，无需后端或数据库，无需登录注册。

- 部署平台：Vercel
- 项目性质：纯前端静态站点
- 访问体验：首屏加载快，所有交互在客户端完成

---

## 二、技术栈

| 类别 | 选型 | 说明 |
|------|------|------|
| 框架 | Next.js (App Router) | 页面路由、SSG 预渲染 |
| 语言 | TypeScript | 类型安全 |
| HTTP | Axios | 如有外部 API 调用统一使用 |
| 状态管理 | Zustand | 轻量级全局状态（如搜索词、主题等） |
| 组件库 | shadcn/ui | 基于 Radix 的无样式组件 |
| 样式 | Tailwind CSS | 原子化样式 |
| 部署 | Vercel | 零配置部署 |

---

## 三、路由设计

采用 Next.js App Router 的文件系统路由。

```
/                           → 首页 (介绍 + 两个导航按钮)
/tools                      → 工具一览页 (搜索 + 工具卡片流式网格)
/tools/[toolId]             → 工具详情页 (具体工具的实现)
/sites                      → 网站一览页 (搜索 + 网站卡片流式布局)
```

路由文件结构：

```
src/
├── app/
│   ├── page.tsx                → /
│   ├── layout.tsx              → 根布局 (Header、Footer)
│   ├── tools/
│   │   ├── page.tsx            → /tools
│   │   └── [toolId]/
│   │       └── page.tsx        → /tools/[toolId]
│   └── sites/
│       └── page.tsx            → /sites
├── components/                 → 共享 UI 组件
├── data/                       → 工具 & 网站的静态数据定义
├── lib/                        → shadcn/ui 生成的 utils
├── tools/                      → 各工具的独立实现（按文件夹区分）
├── store/                      → Zustand store
├── types/                      → TypeScript 类型定义
└── util/                       → 公共工具函数
```

---

## 四、页面详细设计

### 4.1 首页 `/`

**布局：自上而下**

1. **Header**（全局）：左侧 logo + 项目名 "moonTool"，右侧导航链接（工具一览、网站一览）
2. **首屏 Hero 区域**：
   - 主标题：moonTool
   - 副标题：工具网站大全
   - 一段简短的项目介绍文字（使用 Typewriter 效果逐字展示："moonTool 提供各式各样的在线工具，以及精选的网站导航，全部免费使用，无需注册。"）
   - 两个大按钮并排：
     - "所有工具一览" → 跳转 `/tools`
     - "所有网站一览" → 跳转 `/sites`
3. **Footer**（全局）：版权信息 © 2026 moonTool、MIT License 链接、GitHub 链接（可选）

**动画效果**：
- 页面加载时英雄区域淡入上移
- 按钮 hover 时放大 + 阴影
- 打字机效果展示介绍文字

### 4.2 工具一览页 `/tools`

**布局**：自上而下

1. **Header**：同全局 Header
2. **搜索区域**（首屏上方居中）：
   - 搜索输入框（shadcn Input 组件），带搜索图标在左侧
   - placeholder 文字："搜索工具名称或描述..."
   - 实时过滤（输入即过滤，无需点搜索按钮），可选防抖 200ms
   - 搜索为空时显示全部工具
3. **工具卡片网格**（搜索区域下方）：
   - 使用 CSS Grid 流式布局：`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
   - 每个卡片包含：
     - 工具图标/emoji（如 🧮 🔧 📝 等）
     - 工具名称
     - 简短描述（1-2行）
     - 标签（badge chips，标明类别如"转换""生成""开发"等）
   - 卡片 hover：轻微上浮 + 边框高亮
   - 点击卡片 → 跳转 `/tools/[toolId]`
4. **Footer**：同全局 Footer

### 4.3 网站一览页 `/sites`

**布局**：自上而下

1. **Header**：同全局 Header
2. **搜索区域**（首屏靠上半部分居中）：
   - 搜索输入框，带搜索图标，placeholder："搜索网站名称或描述..."
   - 实时过滤，防抖 200ms
   - 搜索为空时显示全部网站
3. **网站卡片网格**：
   - CSS Grid 流式布局
   - 每个卡片包含：
     - 网站 favicon / 图标
     - 网站名称
     - 简短描述
     - 分类标签（如"设计""开发""AI""效率"等）
     - 域名文字
   - 点击卡片 / 点击"访问"按钮
     - 使用 `target="_blank" rel="noopener noreferrer"` 在新标签页打开网站
     - 直接跳转，无详情页
4. **Footer**：同全局 Footer

### 4.4 工具详情页 `/tools/[toolId]`

**布局**：自上而下

1. **Header**：同全局 Header
2. **面包屑导航**：首页 > 工具一览 > 当前工具名
3. **工具核心区域**：
   - 动态加载对应工具组件
   - 工具组件从 `src/tools/[toolId]/` 目录导入
   - 如果 `toolId` 不存在，显示 404 提示
4. **Footer**：同全局 Footer

---

## 五、数据模型

### 5.1 工具数据结构

```typescript
// src/types/index.ts

interface Tool {
  id: string;           // 唯一标识，用于路由，如 "json-formatter"
  name: string;         // 显示名称，如 "JSON 格式化"
  description: string;  // 简短描述，用于卡片和搜索
  icon: string;         // emoji 图标，如 "🔧"
  tags: string[];       // 分类标签，如 ["转换", "开发"]
  component: string;    // 工具组件路径（相对于 tools 目录），用于动态导入
}
```

### 5.2 网站数据结构

```typescript
interface Site {
  id: string;           // 唯一标识
  name: string;         // 网站名称
  description: string;  // 简短描述
  url: string;          // 跳转 URL（带 https://）
  icon: string;         // emoji 图标或 favicon
  tags: string[];       // 分类标签，如 ["设计", "AI"]
}
```

### 5.3 静态数据文件

工具和网站数据分别存放在：

- `src/data/tools.ts` — 导出 `tools: Tool[]`
- `src/data/sites.ts` — 导出 `sites: Site[]`

新增工具/网站只需在这些文件中添加条目 + 在 `src/tools/` 中创建对应组件目录。

---

## 六、组件树 & 文件清单

### 6.1 全局布局组件

```
src/app/layout.tsx           → 根布局，包含 Header + children + Footer
src/components/Header.tsx    → 顶部导航栏（响应式，移动端汉堡菜单）
src/components/Footer.tsx    → 底部版权信息
```

### 6.2 首页组件

```
src/app/page.tsx                     → 首页页面
src/components/HeroSection.tsx       → 英雄区域（打字机效果 + 导航按钮）
```

### 6.3 工具一览页组件

```
src/app/tools/page.tsx               → 工具一览页面
src/components/ToolCard.tsx          → 单个工具卡片
src/components/ToolGrid.tsx          → 工具卡片网格容器（含搜索过滤逻辑）
src/components/SearchInput.tsx       → 搜索输入框组件（工具页和网站页共用）
```

### 6.4 网站一览页组件

```
src/app/sites/page.tsx               → 网站一览页面
src/components/SiteCard.tsx          → 单个网站卡片
src/components/SiteGrid.tsx          → 网站卡片网格容器（含搜索过滤逻辑）
```

### 6.5 工具详情页

```
src/app/tools/[toolId]/page.tsx      → 工具详情页（动态路由，加载对应工具组件）
```

### 6.6 工具实现目录

```
src/tools/
├── json-formatter/
│   ├── index.ts                     → 导出工具组件
│   └── JsonFormatter.tsx            → 工具主组件
├── base64-encoder/
│   ├── index.ts
│   └── Base64Encoder.tsx
├── color-palette/
│   ├── index.ts
│   └── ColorPalette.tsx
└── ... (更多工具按此模式添加)
```

每个工具目录是独立的，内部代码自行管理，不跨工具引用。公共逻辑抽到 `src/util/`。

### 6.7 状态管理 & 工具函数

```
src/store/useSearchStore.ts          → Zustand store（当前搜索词、过滤结果）
src/util/cn.ts                       → Tailwind classnames 合并 (clsx + tailwind-merge)
src/util/search.ts                   → 模糊搜索工具函数
src/types/index.ts                   → 所有 TS 类型定义
```

---

## 七、关键交互细节

### 7.1 搜索过滤逻辑

- 使用 Zustand store 管理搜索词
- 输入框 onChange 触发 store 更新（防抖 200ms）
- 工具/网站列表根据搜索词实时过滤
- 模糊匹配：`.filter()` + `.includes()`（不区分大小写），匹配 name 和 description 字段
- 无匹配结果时显示空状态提示："没有找到匹配的工具/网站"

### 7.2 工具详情动态加载

详情页使用 Next.js `generateStaticParams` 预生成所有工具路由：

```typescript
// src/app/tools/[toolId]/page.tsx
export function generateStaticParams() {
  return tools.map(tool => ({ toolId: tool.id }));
}
```

组件通过工具数据中的 `component` 字段指向，使用 `dynamic(() => import(...))` 加载。

### 7.3 响应式设计

- 移动端（< 768px）：单列布局，Header 折叠为汉堡菜单
- 平板（768px - 1024px）：双列网格
- 桌面（> 1024px）：三列网格

### 7.4 动画 & 过渡

- Hero 区域：fade-in + slide-up 入场动画
- 卡片：hover 时 scale 放大（1.02～1.05）+ 阴影加深
- 搜索：输入时卡片列表平滑过渡
- 使用 Tailwind `transition` 和 `animate` 内置类，必要时用 `framer-motion`

---

## 八、项目启动 & 部署

### 8.1 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
# 默认访问 http://localhost:3000
```

### 8.2 项目初始化命令（首次搭建）

```bash
npx create-next-app@latest moonTool --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
cd moonTool
pnpm add axios zustand clsx tailwind-merge framer-motion
npx shadcn@latest init
npx shadcn@latest add button input card badge separator breadcrumb
```

### 8.3 Vercel 部署

1. 将项目推送到 GitHub
2. 在 Vercel 中 import 该项目
3. Vercel 自动识别 Next.js 项目，无需额外配置
4. 部署完成后获得生产 URL

项目目录要求：
- 根目录为 Next.js 项目根目录
- `package.json` 在根目录
- `next.config.ts` 配置输出模式为静态导出（可选，默认 SSR 也可）

### 8.4 环境变量（暂无）

当前为纯静态站点，无需环境变量。后续如需接入外部 API（如 AI 工具调用），在根目录创建 `.env.local` 并通过 `NEXT_PUBLIC_` 前缀暴露给前端。

---

## 九、代码规范

### 9.1 目录命名

- 路由目录：kebab-case（`json-formatter`, `base64-encoder`）
- 组件文件：PascalCase（`ToolCard.tsx`, `SearchInput.tsx`）
- 工具函数文件：camelCase（`cn.ts`, `search.ts`）

### 9.2 组件写法

- 使用函数组件 + TypeScript
- Props 类型使用 interface 或 type 定义
- 优先使用 shadcn/ui 组件，不自行造轮子
- 逻辑抽到 hooks 中：`src/hooks/useSearch.ts` 等

### 9.3 导入顺序

```
1. React / Next.js
2. 第三方库
3. 项目内部（@/components, @/util, @/data...）
4. 样式 / 资源
```

---

## 十、扩展指南

### 新增一个工具

1. 在 `src/data/tools.ts` 中添加一条工具数据
2. 在 `src/tools/` 下创建 `[tool-id]/` 目录
3. 创建 `index.ts` 和工具组件文件
4. 工具会自动出现在工具一览页和搜索中

### 新增一个网站

1. 在 `src/data/sites.ts` 中添加一条网站数据
2. 网站自动出现在网站一览页和搜索中（无需创建组件）

---

## 十一、注意事项

1. **纯前端注册**：所有工具和网站通过代码静态定义，不依赖任何外部 CMS 或数据库
2. **无认证**：所有页面公开访问，不区分用户角色
3. **工具隔离**：每个工具独立目录，不可跨工具引用内部代码；公共逻辑放 `src/util/` 或 `src/hooks/`
4. **SEO 友好**：使用 Next.js Metadata API 为每个页面设置标题和描述
5. **⚠️ Vercel Hobby 限制**：Vercel Hobby 方案每月有 **100 GB** 带宽限制，超过后会返回 429/402 错误并暂停服务。纯静态页面通常够用，但如果工具中包含大文件处理（图片压缩、视频处理等），需在前端完全处理，不占用带宽
