import { createFileRoute } from '@tanstack/react-router';
import { SSLProxySetting } from './components/SSLProxySetting';

export const Route = createFileRoute('/settings/ssl-proxy')({
  component: SSLProxySetting,
});
