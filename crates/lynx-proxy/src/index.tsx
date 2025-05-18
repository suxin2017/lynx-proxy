import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import App from './App';
import '@ant-design/v5-patch-for-react-19';

// 在 React 渲染前同步设置 dark class，防止主题切换闪烁
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
