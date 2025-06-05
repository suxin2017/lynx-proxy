import { StyleProvider } from '@ant-design/cssinjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { App as AntdApp, ConfigProvider, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import './main.css';
import { routeTree } from './routeTree.gen';
import { LanguageProvider } from './contexts/LanguageContext';
import { useAntdLocale } from './contexts/useAntdLocale';

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

const AppContent = () => {
  const [isDark, setIsDark] = useState(getIsDark());
  const antdLocale = useAntdLocale();

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
    <ConfigProvider
      locale={antdLocale}
      theme={{
        cssVar: true,
        hashed: false,
        token: {
          borderRadius: 6,
          colorBgBase: isDark ? '#0d0d0d' : '#f9fafb',
          colorBgContainer: isDark ? '#0d0d0d' : '#f9fafb',
          colorBgElevated: isDark ? '#0d0d0d' : '#f9fafb',
        },
        algorithm: antdAlgorithm,
      }}
    >
      <AntdApp className="h-full w-full">
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <StyleProvider layer>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </StyleProvider>
    </QueryClientProvider>
  );
};

export default App;
