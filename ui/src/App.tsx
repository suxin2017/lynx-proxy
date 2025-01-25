import './main.css';
import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { StyleProvider } from '@ant-design/cssinjs';
import { routeTree } from './routeTree.gen';
import { ConfigProvider, theme } from 'antd';
import {
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query';
import { createFromIconfontCN } from '@ant-design/icons';

const hashHistory = createHashHistory();

// Set up a Router instance
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  // history: hashHistory,
});

// Register things for typesafety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const MyIcon = createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/c/font_4818588_s3v6o466krp.js', // 在 iconfont.cn 上生成
});


const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <StyleProvider layer>
        <ConfigProvider
          theme={{
            token: {
              borderRadius: 8,
            },
            algorithm: [theme.compactAlgorithm],
          }}
        >
          <MyIcon type="icon-layout-left-line"/>
          <MyIcon type="icon-layout-top-line"/>
          <RouterProvider router={router} />{' '}
        </ConfigProvider>
      </StyleProvider>
    </QueryClientProvider>
  );
};

export default App;
