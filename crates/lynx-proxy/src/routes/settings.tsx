import { createFileRoute, Outlet } from '@tanstack/react-router';
import { SettingsMenu } from './settings/components/SettingsMenu';

export const Route = createFileRoute('/settings')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="animate-fade-in flex h-full w-full flex-col items-center">
      <div className="flex w-[560px] flex-col gap-4">
        <SettingsMenu />
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
