/** 60° 倾斜黑胶在屏幕上的占位比例（含方形玻璃垫层） */
export const VINYL_SCENE = {
  heightRatio: 0.72,
  widthRatio: 1.22,
  /** 顶栏 + 标题 + 搜索 + 底部按钮/圆点 + 曲名 */
  reservedPx: 330,
  minDisc: 220,
} as const;

/** 桌面横屏：仅按视口高度计算唱片直径，不限制左右宽度 */
export function calcDiscSize(_viewportW: number, viewportH: number): number {
  const { heightRatio, reservedPx, minDisc } = VINYL_SCENE;
  const maxH = (viewportH - reservedPx) / heightRatio;
  return Math.floor(Math.max(minDisc, maxH));
}

export function calcSceneWidth(discSize: number): number {
  return Math.round(discSize * VINYL_SCENE.widthRatio);
}

export function calcSceneHeight(discSize: number): number {
  return Math.round(discSize * VINYL_SCENE.heightRatio);
}
