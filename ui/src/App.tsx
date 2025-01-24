import './main.css';
import { createHashHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { StyleProvider } from '@ant-design/cssinjs';
import { routeTree } from './routeTree.gen';
import { ConfigProvider, theme } from 'antd';
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
const App = () => {
  return (
    <StyleProvider layer>
      <ConfigProvider
        theme={{
          token: {
            borderRadius: 8,
          },
          algorithm: [theme.compactAlgorithm],
        }}
      >
        <RouterProvider router={router} />{' '}
      </ConfigProvider>
    </StyleProvider>
  );
};

export default App;
