import { SideBar } from '@/components/SideBar';
import { store, useUpdateRequestLog } from '@/store';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Provider } from 'react-redux';

export const Route = createRootRoute({
  component: RootComponent,
});

function InnerRouteComponent() {
  useUpdateRequestLog();
  return (
    <div className="flex h-full w-full flex-1">
      <div className="flex">
        <SideBar />
      </div>
      <div className="flex flex-1 p-2 w-[calc(100%-56px)]">
        <Outlet />
      </div>
    </div>
  );
}

function RootComponent() {
  return (
    <Provider store={store}>
      <InnerRouteComponent />
    </Provider>
  );
}
