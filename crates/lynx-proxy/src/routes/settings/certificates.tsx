import { createFileRoute } from '@tanstack/react-router';
import { CertificatesSetting } from './components/CertificateSetting';

export const Route = createFileRoute('/settings/certificates')({
  component: RouteComponent,
});

function RouteComponent() {
  return <CertificatesSetting />;
}
