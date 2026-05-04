import { Site } from "@/types";

export const sites: Site[] = [
  {
    id: "canva",
    name: "Canva",
    description: "在线图形设计工具，轻松创建社交媒体图像、演示文稿等",
    url: "https://www.canva.com",
    icon: "🎨",
    tags: ["设计"],
  },
  {
    id: "figma",
    name: "Figma",
    description: "协作式 UI 设计工具",
    url: "https://www.figma.com",
    icon: "🖌️",
    tags: ["设计", "开发"],
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    description: "OpenAI 出品的对话式 AI 助手",
    url: "https://chat.openai.com",
    icon: "🤖",
    tags: ["AI"],
  },
  {
    id: "github",
    name: "GitHub",
    description: "全球最大的代码托管与协作平台",
    url: "https://github.com",
    icon: "💻",
    tags: ["开发"],
  },
  {
    id: "notion",
    name: "Notion",
    description: "全能型笔记与知识管理工具",
    url: "https://www.notion.so",
    icon: "📝",
    tags: ["效率"],
  },
];
