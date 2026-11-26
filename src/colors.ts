/** Notes and lane accents, in left-to-right lane order. */
export const LANE_COLORS = ['#ff98c7', '#89e268', '#f4f4ff', '#f76562', '#b59aff', '#ffe38c'] as const;
export const LANE_SHADOW_COLORS = ['#702c4e', '#275f0a', '#76777d', '#58000a', '#402c6a', '#7f6604'] as const;
export const LANE_FLASH_COLORS = ['#ffecf3', '#defdd4', '#f1f1f5', '#ffedeb', '#f2efff', '#fef2ca'] as const;

export function setLaneColors(target: HTMLElement, lane: number): void {
  target.style.setProperty('--lane', LANE_COLORS[lane]);
  target.style.setProperty('--lane-shadow', LANE_SHADOW_COLORS[lane]);
}
