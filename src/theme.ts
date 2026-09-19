/**
 * 配色方案定义
 * 侧边栏：红涨绿跌
 * 底部状态栏：白色涨，灰色跌
 */

export const THEME = {
  // 侧边栏颜色（红涨绿跌）
  sidebar: {
    up: '#ef4444',      // 红色 - 涨
    down: '#22c55e',    // 绿色 - 跌
    flat: '#9ca3af'     // 灰色 - 平
  },
  
  // 底部状态栏颜色（白涨灰跌）
  statusBar: {
    up: '#ffffff',      // 白色 - 涨
    down: '#6b7280',    // 深灰色 - 跌
    flat: '#9ca3af'     // 灰色 - 平
  }
} as const;
