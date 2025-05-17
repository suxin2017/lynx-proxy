import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Navigate to="/settings/general" replace={true} />;
}
