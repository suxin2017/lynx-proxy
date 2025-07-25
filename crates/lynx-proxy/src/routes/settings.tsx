import { createFileRoute, Outlet } from '@tanstack/react-router';
import { SettingsMenu } from './settings/components/SettingsMenu';

export const Route = createFileRoute('/settings')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="animate-fade-in flex flex-1 justify-center">
      <div className="flex flex-1 min-w-[500px] max-w-[800px] flex-col gap-4 scroll-auto px-4">
        <SettingsMenu />
        <div className="my-2 flex flex-col flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
