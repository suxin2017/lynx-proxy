import { createFileRoute } from '@tanstack/react-router';
import { CertificateInstallDoc } from './components/CertificateInstallDoc';

export const Route = createFileRoute('/certificates/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex-1 flex flex-col items-center">
      <div>
        <CertificateInstallDoc />
      </div>
    </div>
  );
}
