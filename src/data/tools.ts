import { Tool } from "@/types";

export const tools: Tool[] = [
  {
    id: "json-formatter",
    name: "JSON 格式化",
    description: "格式化、压缩和校验 JSON 数据",
    icon: "🔧",
    tags: ["转换", "开发"],
    component: "json-formatter",
  },
  {
    id: "base64-encoder",
    name: "Base64 编解码",
    description: "Base64 编码与解码工具",
    icon: "🔐",
    tags: ["转换", "开发"],
    component: "base64-encoder",
  },
  {
    id: "color-palette",
    name: "调色板",
    description: "颜色选择与配色方案生成",
    icon: "🎨",
    tags: ["设计", "生成"],
    component: "color-palette",
  },
];
