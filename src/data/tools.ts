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
  {
    id: "crypto-tool",
    name: "加密解密",
    description: "支持多种加密算法的文本加密解密工具",
    icon: "🔒",
    tags: ["加密", "安全", "开发"],
    component: "crypto-tool",
  },
  {
    id: "code-generator",
    name: "二维码/条形码",
    description: "生成二维码和各种格式的条形码",
    icon: "📱",
    tags: ["生成", "工具"],
    component: "code-generator",
  },
];
