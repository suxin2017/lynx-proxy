import { createFileRoute } from '@tanstack/react-router';
import { NetworkSetting } from './components/NetworkSetting';

export const Route = createFileRoute('/settings/network')({
  component: RouteComponent,
});

function RouteComponent() {
  return <NetworkSetting />;
}
