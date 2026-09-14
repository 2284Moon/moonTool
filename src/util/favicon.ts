/**
 * 根据网站 URL 生成 favicon 图片地址候选列表（按优先级排序，用于加载失败时的降级）。
 *
 * 降级链（调用方按序尝试，某个源加载失败则切换下一个）：
 *   1. Google s2/favicons —— 国际通用，但中国大陆通常不可访问
 *   2. DuckDuckGo icons  —— 国际备用图源
 *   3. t0.gstatic.cn faviconV2 —— 国内可访问，作为最终兜底
 *
 * 全部失败时由调用方（SiteCard）回退到站点自带的 emoji 图标。
 */

// Google 源按展示尺寸匹配分辨率
const GOOGLE_SIZES = [16, 32, 64, 96, 128] as const;

/**
 * @param rawUrl 站点 URL
 * @param size   期望展示的像素尺寸
 * @returns favicon 候选地址数组（已按优先级排序）；URL 非法时返回空数组（调用方应回退到 emoji）
 */
export function getFaviconCandidates(rawUrl: string, size = 32): string[] {
  try {
    const domain = new URL(rawUrl).hostname;
    if (!domain) return [];
    const sz = GOOGLE_SIZES.find((s) => s >= size) ?? 128;

    return [
      // 1. Google（国际）
      `https://www.google.com/s2/favicons?sz=${sz}&domain_url=${domain}`,
      // 2. DuckDuckGo（国际备用）
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      // 3. gstatic（国内兜底）
      `https://t0.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=${size}`,
    ];
  } catch {
    return [];
  }
}

/** 兼容旧调用：返回优先级最高的 favicon 地址（Google 源）。 */
export function getFaviconUrl(rawUrl: string, size = 32): string {
  return getFaviconCandidates(rawUrl, size)[0] ?? "";
}
