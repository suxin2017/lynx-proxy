import { SideBar } from '@/components/SideBar';
import { store, useSortPoll } from '@/store/useSortPoll';
import { GeneralSettingProvider } from '@/store/useGeneralState';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Provider } from 'react-redux';
import { UseSelectRequestProvider } from './network/components/store/selectRequestStore';
import { useSseMonitor } from '@/store/useSse';

export const Route = createRootRoute({
  component: RootComponent,
});

function InnerRouteComponent() {
  useSortPoll();
  useSseMonitor()
  return (
      <div className="flex   flex-1">
        <div className="flex">
          <SideBar />
        </div>
        <div className="flex basis-[calc(100%-56px)] flex-1 p-2">
          <Outlet />
        </div>
      </div>
  );
}

function RootComponent() {
  return (
    <UseSelectRequestProvider>
      <GeneralSettingProvider>
        <Provider store={store}>
          <InnerRouteComponent />
        </Provider>
      </GeneralSettingProvider>
    </UseSelectRequestProvider>
  );
}
