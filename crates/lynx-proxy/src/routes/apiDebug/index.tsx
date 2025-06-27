import { createFileRoute } from '@tanstack/react-router';
import { ApiDebugPage } from './components/ApiDebugPage';

export const Route = createFileRoute('/apiDebug/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <ApiDebugPage />;
}
