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
}
