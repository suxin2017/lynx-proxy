import { createFileRoute, Outlet } from '@tanstack/react-router';
import { SettingsMenu } from './settings/components/SettingsMenu';

export const Route = createFileRoute('/settings')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="animate-fade-in flex h-full w-full flex-col items-center">
      <div className="flex h-full w-full max-w-[800px] flex-col gap-4 scroll-auto px-4">
        <SettingsMenu />
        <div className="my-2 h-full flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
