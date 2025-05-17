import './main.css';
import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { StyleProvider } from '@ant-design/cssinjs';
import { routeTree } from './routeTree.gen';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';

const hashHistory = createHashHistory();
// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  history: hashHistory,
});

// Register things for typesafety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const getIsDark = () => {
  if (typeof window !== 'undefined') {
    return document.documentElement.classList.contains('dark');
  }
  return false;
};

const App = () => {
  const [isDark, setIsDark] = useState(getIsDark());

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(getIsDark());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const antdAlgorithm = useMemo(() => {
    return isDark ? [theme.darkAlgorithm] : [];
  }, [isDark]);

  return (
    <QueryClientProvider client={queryClient}>
      <StyleProvider layer>
        <ConfigProvider
          theme={
            {
              // cssVar: true,
              // hashed: false,
              // token: {
              //   borderRadius: 6,
              //   colorBgBase: isDark ? '#0d0d0d' : '#f9fafb',
              // },
              // algorithm: antdAlgorithm,
            }
          }
        >
          <AntdApp className="h-full w-full">
            <RouterProvider router={router} />
          </AntdApp>
        </ConfigProvider>
      </StyleProvider>
    </QueryClientProvider>
  );
};

export default App;
