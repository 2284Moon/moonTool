export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  component: string;
}

export interface Site {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  tags: string[];
  /** true 表示用户通过 /api/sites 添加的站点；常驻站点（src/data/sites.ts）无此字段 */
  userAdded?: boolean;
}
