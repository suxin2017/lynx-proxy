import { createFileRoute } from '@tanstack/react-router';
import { AppSetting } from './components/AppSetting';

export const Route = createFileRoute('/setting/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-1 animate-fade-in">
      <AppSetting />
    </div>
  );
}
