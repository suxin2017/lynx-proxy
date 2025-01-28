import { SideBar } from '@/components/SideBar';
import { Outlet, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="flex h-screen flex-1">
      <div className="flex">
        <SideBar />
      </div>
      <div className="flex flex-1">
        <Outlet />
      </div>
    </div>
  );
}
