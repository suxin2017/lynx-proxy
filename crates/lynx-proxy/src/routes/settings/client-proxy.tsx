import { createFileRoute } from '@tanstack/react-router';
import { ClientProxySettings } from './components/ClientProxySettings';

export const Route = createFileRoute('/settings/client-proxy')({
  component: RouteComponent,
});

function RouteComponent() {
  return <ClientProxySettings />;
}
