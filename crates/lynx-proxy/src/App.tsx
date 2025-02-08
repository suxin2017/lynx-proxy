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
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

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
  queryCache: new QueryCache({
    onError: (error) => {
      console.log(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.log(error);
    },
  }),
});

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
          <RouterProvider router={router} />
        </ConfigProvider>
      </StyleProvider>
    </QueryClientProvider>
  );
};

export default App;
