import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import App from './App';
import '@ant-design/v5-patch-for-react-19';
import { registerSW, setupInstallPrompt } from './pwa';
import { initThemeColorObserver } from './utils/themeColor';

const theme = localStorage.getItem('theme');
if (
  theme === 'dark' ||
  (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

// Register PWA functionality
registerSW();
setupInstallPrompt();

// 初始化主题颜色观察器
initThemeColorObserver();
