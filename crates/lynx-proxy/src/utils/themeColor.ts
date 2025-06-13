/**
 * 动态更改浏览器标题栏主题颜色的工具函数
 */

// 主题颜色配置
const THEME_COLORS = {
  light: '#f8fafc', // 亮色主题 - 蓝色
  dark: '#0d0d0d',  // 暗色主题 - 深灰色
} as const;

/**
 * 更新标题栏主题颜色
 * @param theme - 主题类型 ('light' | 'dark')
 * @param customColor - 自定义颜色 (可选)
 */
export function updateThemeColor(theme: 'light' | 'dark', customColor?: string) {
  const color = customColor || THEME_COLORS[theme];
  
  // 查找现有的 theme-color meta 标签
  let themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
  
  if (!themeColorMeta) {
    // 如果不存在，创建一个新的
    themeColorMeta = document.createElement('meta');
    themeColorMeta.name = 'theme-color';
    document.head.appendChild(themeColorMeta);
  }
  
  // 更新颜色
  themeColorMeta.content = color;
  
  // 存储当前设置的颜色到 localStorage
  localStorage.setItem('theme-color', color);
  localStorage.setItem('theme-color-type', theme);
  
  console.log(`Theme color updated to: ${color} for ${theme} theme`);
}

/**
 * 设置自定义主题颜色
 * @param color - 颜色值 (hex 格式)
 */
export function setCustomThemeColor(color: string) {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
  if (themeColorMeta) {
    themeColorMeta.content = color;
    localStorage.setItem('theme-color', color);
    localStorage.setItem('theme-color-type', 'custom');
    console.log(`Custom theme color set to: ${color}`);
  }
}

/**
 * 获取当前主题颜色
 */
export function getCurrentThemeColor(): string {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
  return themeColorMeta?.content || THEME_COLORS.light;
}

/**
 * 根据当前系统主题自动设置主题颜色
 */
export function autoUpdateThemeColor() {
  const isDark = document.documentElement.classList.contains('dark');
  const savedColor = localStorage.getItem('theme-color');
  const savedType = localStorage.getItem('theme-color-type');
  
  // 如果有保存的自定义颜色，使用自定义颜色
  if (savedType === 'custom' && savedColor) {
    setCustomThemeColor(savedColor);
  } else {
    // 否则根据主题类型设置颜色
    updateThemeColor(isDark ? 'dark' : 'light');
  }
}

/**
 * 重置为默认主题颜色
 */
export function resetThemeColor() {
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.removeItem('theme-color');
  localStorage.removeItem('theme-color-type');
  updateThemeColor(isDark ? 'dark' : 'light');
}

/**
 * 监听主题变化并自动更新主题颜色
 */
export function initThemeColorObserver() {
  // 初始设置
  autoUpdateThemeColor();
  
  // 监听 DOM 变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        // 只有在非自定义颜色模式下才自动更新
        const savedType = localStorage.getItem('theme-color-type');
        if (savedType !== 'custom') {
          autoUpdateThemeColor();
        }
      }
    });
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  
  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = (e: MediaQueryListEvent) => {
    // 只有当用户没有手动设置主题且不是自定义颜色时才跟随系统主题
    const userTheme = localStorage.getItem('theme');
    const savedType = localStorage.getItem('theme-color-type');
    if (!userTheme && savedType !== 'custom') {
      updateThemeColor(e.matches ? 'dark' : 'light');
    }
  };
  
  mediaQuery.addEventListener('change', handleSystemThemeChange);
  
  return () => {
    observer.disconnect();
    mediaQuery.removeEventListener('change', handleSystemThemeChange);
  };
}

export { THEME_COLORS };
